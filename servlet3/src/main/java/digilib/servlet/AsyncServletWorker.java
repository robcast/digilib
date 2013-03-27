package digilib.servlet;

/*
 * #%L
 * AsyncServletWorker.java
 * 
 * Worker class for the asynchronous Servlet API.
 * 
 * %%
 * Copyright (C) 2011 - 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * 
 * Author: Robert Casties (robcast@berlios.de) 19.2.2011
 */

import java.io.IOException;

import javax.servlet.AsyncContext;
import javax.servlet.AsyncEvent;
import javax.servlet.AsyncListener;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import digilib.conf.DigilibConfiguration;
import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.image.ImageWorker;
import digilib.servlet.Scaler.ErrMsg;
import digilib.servlet.Scaler.Error;

/**
 * Worker class for the asynchronous Servlet API.
 * 
 * @author casties
 * 
 */
public class AsyncServletWorker implements Runnable, AsyncListener {

    /** the AsyncServlet context */
    private AsyncContext asyncContext;

    /** the ImageWorker we use */
    private ImageWorker imageWorker;

    protected static Logger logger = Logger.getLogger(AsyncServletWorker.class);
    private long startTime;
    private ErrMsg errMsgType = ErrMsg.IMAGE;
    private ImageJobDescription jobinfo;
    /** flag to indicate that the response is completed (on abort) */
    private boolean completed = false;
    /** AsyncRequest timeout */
    protected static long timeout = 60000l;

    /**
     * @param dlConfig
     * @param jobinfo
     */
    public AsyncServletWorker(DigilibConfiguration dlConfig,
            ImageJobDescription jobinfo, AsyncContext asyncContext,
            ErrMsg errMsgType, long startTime) {
        // set up image worker
        imageWorker = new ImageWorker(dlConfig, jobinfo);
        // save AsyncContext
        this.asyncContext = asyncContext;
        asyncContext.setTimeout(AsyncServletWorker.timeout);
        logger.debug("timeout for worker: " + asyncContext.getTimeout() + "ms");
        this.startTime = startTime;
        this.errMsgType = errMsgType;
        this.jobinfo = jobinfo;
    }

    /**
     * runs the ImageWorker and writes the image to the ServletResponse.
     */
    @Override
    public void run() {
        try {
            // render the image
            DocuImage img = imageWorker.call();
            if (completed) {
                logger.debug("AsyncServletWorker already completed (after scaling)!");
                return;
            }
            // forced destination image type
            String mt = null;
            if (jobinfo.hasOption("jpg")) {
                mt = "image/jpeg";
            } else if (jobinfo.hasOption("png")) {
                mt = "image/png";
            }
            // send image
            ServletOps.sendImage(img, mt,
                    (HttpServletResponse) asyncContext.getResponse(), logger);
            logger.debug("Job done in: "
                    + (System.currentTimeMillis() - startTime) + "ms");
        } catch (ImageOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            Scaler.digilibError(errMsgType, Error.IMAGE, null,
                    (HttpServletResponse) asyncContext.getResponse());
        } catch (IOException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            Scaler.digilibError(errMsgType, Error.FILE, null,
                    (HttpServletResponse) asyncContext.getResponse());
        } catch (ServletException e) {
            logger.error("Servlet error: ", e);
        } catch (Exception e) {
            logger.error("Other error: ", e);
        } finally {
            if (completed) {
                logger.debug("AsyncServletWorker already completed (finally)!");
            } else {
                // submit response
                logger.debug("context complete.");
                this.completed = true;
                asyncContext.complete();
            }
        }

    }

    @Override
    public void onStartAsync(AsyncEvent event) throws IOException {
        logger.debug("onStartAsync called (why?)");
    }

    @Override
    public void onComplete(AsyncEvent event) throws IOException {
        logger.debug("AsyncServletWorker onComplete");
        // make sure complete isn't called twice
        this.completed = true;
    }

    @Override
    public void onError(AsyncEvent event) throws IOException {
        logger.error("AsyncServletWorker onError: " + event.toString());
        if (completed) {
            logger.debug("AsyncServletWorker already completed (TimeOut)!");
            return;
        }
        imageWorker.stopNow();
        this.completed = true;
        Scaler.digilibError(errMsgType, Error.UNKNOWN, null,
                (HttpServletResponse) asyncContext.getResponse());
        asyncContext.complete();
    }

    @Override
    public void onTimeout(AsyncEvent event) throws IOException {
        logger.error("AsyncServletWorker TIMED OUT after "
                + (System.currentTimeMillis() - startTime)
                + "ms! (increase worker-timeout?)");
        if (completed) {
            logger.debug("AsyncServletWorker already completed (TimeOut)!");
            return;
        }
        imageWorker.stopNow();
        this.completed = true;
        Scaler.digilibError(errMsgType, Error.UNKNOWN, "ERROR: timeout rendering image!",
                (HttpServletResponse) asyncContext.getResponse());
        asyncContext.complete();
    }

    public static long getTimeout() {
        return timeout;
    }

    public static void setTimeout(long timeout) {
        AsyncServletWorker.timeout = timeout;
    }

}
