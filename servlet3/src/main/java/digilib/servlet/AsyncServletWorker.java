package digilib.servlet;

/*
 * #%L
 * AsyncServletWorker.java
 * 
 * Worker class for the asynchronous Servlet API.
 * 
 * %%
 * Copyright (C) 2011 - 2025 MPIWG Berlin
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
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibConfiguration;
import digilib.image.DocuImage;
import digilib.image.ImageJobDescription;
import digilib.image.ImageOpException;
import digilib.image.ImageOutputException;
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
    private AsyncContext asyncContext = null;

    /** the ImageWorker we use */
    private ImageWorker imageWorker = null;

    protected static final Logger logger = LoggerFactory.getLogger("digilib.scaler");
    private long startTime;
    private ErrMsg errMsgType = ErrMsg.IMAGE;
    private ImageJobDescription jobinfo;
    /** flag to indicate that sending the response has started */
    private boolean responseStarted = false;
    /** flag to indicate that the context is completed (on abort) */
    private boolean completed = false;
    /** AsyncRequest timeout */
    protected static long timeout = 60000l;

    /**
     * @param dlConfig the DigilibConfiguration
     * @param jobinfo the ImageJobDescription
     * @param asyncContext the AsyncContext
     * @param errMsgType the Errmsg
     * @param startTime the start time
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
            /*
             * render the image
             */
            DocuImage img = imageWorker.call();
            if (completed) {
                logger.debug("AsyncServletWorker already completed (after scaling)!");
                return;
            }
            /*
             * get destination image type
             */
            String mt = jobinfo.getOutputMimeType();
            
            /*
             *  send the image
             */
            HttpServletResponse response = (HttpServletResponse) asyncContext.getResponse();
            responseStarted = true;
            ServletOps.sendImage(img, mt, response, logger);            
            
            logger.info("Done in "
                    + (System.currentTimeMillis() - startTime) + "ms (scaled)");
        } catch (ImageOpException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            Scaler.digilibError(errMsgType, Error.IMAGE, null,
                    (HttpServletResponse) asyncContext.getResponse());
        } catch (ImageOutputException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            // no use in trying to send an error
        } catch (IOException e) {
            logger.error(e.getClass() + ": " + e.getMessage());
            Scaler.digilibError(errMsgType, Error.FILE, null,
                    (HttpServletResponse) asyncContext.getResponse());
        } catch (Exception e) {
            logger.error("Other error: ", e);
        } catch (OutOfMemoryError e) {
        	logger.error("Out of memory: ", e);
        	if (!responseStarted) {
        		Scaler.digilibError(errMsgType, Error.IMAGE, null,
        				(HttpServletResponse) asyncContext.getResponse());
        	}
        } finally {
            if (completed) {
                logger.debug("AsyncServletWorker already completed (finally)!");
            } else {
                // submit response
                logger.debug("context complete.");
                completed = true;
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
        completed = true;
    }

    @Override
    public void onError(AsyncEvent event) throws IOException {
        Throwable exception = event.getThrowable();
        logger.error("AsyncServletWorker onError: " + ((exception != null) ? exception.getMessage() : "???"));
        if (completed) {
            logger.debug("AsyncServletWorker already completed (Error)!");
            return;
        }
        imageWorker.stopNow();
        completed = true;
        // if it's an IOException the response will be dead 
        if (!(exception instanceof IOException)) {
            Scaler.digilibError(errMsgType, Error.UNKNOWN, null,
                    (HttpServletResponse) asyncContext.getResponse());
        }
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
        completed = true;
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
