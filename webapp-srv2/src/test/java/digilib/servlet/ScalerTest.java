package digilib.servlet;

/*
 * #%L
 * ScalerTest -- tests for the digilib Scaler servlet
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2015 MPIWG Berlin
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
 * Author: Robert Casties (robcast@users.sourceforge.net)
 */

import static org.junit.Assert.assertEquals;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;

import org.eclipse.jetty.http.HttpTester;
import org.eclipse.jetty.server.LocalConnector;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.junit.BeforeClass;
import org.junit.Test;

import digilib.conf.DigilibServletConfiguration;

/**
 * ScalerTest -- tests for the digilib Scaler servlet
 * 
 * @author casties
 *
 */
public class ScalerTest {

    private static Server server;
    private static LocalConnector connector;
    
    public static String testFileName = "xterm_color_chart";


    @BeforeClass
    public static void startServer() throws Exception {
        // create servlet container with local connector (replacement for Jetty ServletTester)
        server = new Server();
        connector = new LocalConnector(server);
        server.addConnector(connector);
        ServletContextHandler ctx = new ServletContextHandler(server, "/");
        // set up ServletContext
        ctx.setContextPath("/");
        ctx.setResourceBase("src/main/webapp");       
        // add digilib ContextListener
        DigilibServlet3Configuration dlConfig = new DigilibServletConfiguration();
        ctx.addEventListener(dlConfig);
        // add digilib Scaler servlet
        ctx.addServlet(Scaler.class, "/Scaler/*");
        // start the server
        server.start();
    }

    /**
     * Requests the image file testFileName from the Scaler with the given parameters and returns the image.
     * 
     * Checks the returned content-type (if contentType != null).
     *  
     * @param params
     * @param contentType
     * @return
     * @throws Exception
     * @throws IOException
     */
    private BufferedImage loadImage(String params, String contentType) throws Exception, IOException {
        // prepare request
        HttpTester.Request request = HttpTester.newRequest();
        request.setMethod("GET");
        request.setHeader("Host", "tester"); // should be "tester"
        request.setURI("/Scaler?fn="+testFileName+"&"+params);
        request.setContent("");
        ByteBuffer reqBuf = request.generate();
        // get response
        ByteBuffer respBuf = connector.getResponse(reqBuf);
        // parse response
        HttpTester.Response response = HttpTester.parseResponse(respBuf);
        // should be 200 - OK
        assertEquals("status code", 200, response.getStatus());
        // test response content-type
        if (contentType != null) {
            String ct = response.get("content-type");
            assertEquals("content-type", contentType, ct);
        } else {
            // use png by default for the response reader
            contentType = "image/png";
        }
        // load response as image
        ByteArrayInputStream bis = new ByteArrayInputStream(response.getContentBytes());
        ImageReader reader = ImageIO.getImageReadersByMIMEType(contentType).next();
        reader.setInput(ImageIO.createImageInputStream(bis));
        BufferedImage img = reader.read(0);
        return img;
    }

    /**
     * Test scaling with mo=fit.
     * 
     * Fit selected area to destination image width, staying below destination image height.
     * 
     * @throws Exception
     */
    @Test
    public void testScaleFitWidth() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0&wy=0.961&dw=173&dh=235&mo=fit,errcode", null);
        assertEquals("height", 125, img.getHeight());
        assertEquals("width", 173, img.getWidth());
    }

    /**
     * Test scaling with mo=fill.
     * 
     * Fit selected area to destination image width, expanding area to destination image height.
     *  
     * @throws Exception
     */
    @Test
    public void testScaleFillHeight() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0.0833&wy=0.9224&dw=173&dh=235&mo=fill,errcode", null);
        assertEquals("height", 235, img.getHeight());
        assertEquals("width", 173, img.getWidth());
    }

    /**
     * Test scaling with mo=squeeze.
     * 
     * Fit selected area to destination image width and height by changing aspect ratio.
     * 
     * @throws Exception
     */
    @Test
    public void testScaleSqueeze() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0&wy=0.961&dw=173&dh=235&mo=squeeze,errcode", null);
        assertEquals("height", 235, img.getHeight());
        assertEquals("width", 173, img.getWidth());        
    }

    /**
     * Test scaling with mo=crop.
     * 
     * 
     * @throws Exception
     */
    @Test
    public void testScaleCrop() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0&wy=0.961&dw=173&dh=235&mo=fit,errcode", null);
        assertEquals("height", 125, img.getHeight());
        assertEquals("width", 173, img.getWidth());
    }

    /**
     * Test scaling with mo=clip
     * @throws Exception
     */
    @Test
    public void testScaleClip() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0&wy=0.961&dw=173&dh=235&mo=clip,errcode", null);
        assertEquals("height", 60, img.getHeight());
        assertEquals("width", 173, img.getWidth());        
    }

    /**
     * Test scaling with mo=ascale
     * @throws Exception
     */
    @Test
    public void testScaleAbsolute() throws Exception {
        BufferedImage img = loadImage("mo=ascale&scale=0.1&mo=errcode", null);
        assertEquals("height", 154, img.getHeight());
        assertEquals("width", 96, img.getWidth());        
    }

    /**
     * Test content-type and pixel color of forced image type with mo=jpg
     * @throws Exception
     */
    @Test
    public void testTypeJpg() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0&wy=0.961&dw=173&dh=235&mo=jpg,errcode", "image/jpeg");
        int px = img.getRGB(100, 100);
        assertEquals("pixel color", -8421505, px);
    }

    /**
     * Test content-type and pixel color of forced image type with mo=png
     * @throws Exception
     */
    @Test
    public void testTypePng() throws Exception {
        BufferedImage img = loadImage("ww=0.0836&wh=0.0378&wx=0&wy=0.961&dw=173&dh=235&mo=png,errcode", "image/png");
        int px = img.getRGB(100, 100);
        assertEquals("pixel color", -8421505, px);
    }


}
