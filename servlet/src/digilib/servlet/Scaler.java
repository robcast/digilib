/* Scaler -- Scaler servlet main class

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.servlet;

import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.util.*;

import digilib.*;
import digilib.io.*;
import digilib.image.*;
import digilib.auth.*;


//public class Scaler extends HttpServlet implements SingleThreadModel {
public class Scaler extends HttpServlet {

  // Utils instance with debuglevel
  Utils util;
  // ServletOpss instance
  ServletOps servletOp;
  // FileOps instance
  FileOps fileOp;
  // AuthOps instance
  AuthOps authOp;
  // global DocuImage instance (don't reuse inside a request!)
  DocuImage globalImage;

  // use authorization database
  boolean useAuthentication = true;
  // image file to send in case of error
  File errorImgFile = new File("/docuserver/images/icons/scalerror.gif");
  // image file to send if access is denied
  File denyImgFile = new File("/docuserver/images/icons/denied.gif");
  // base directories in order of preference (prescaled versions first)
  String[] baseDirs = {"/docuserver/scaled/small", "/docuserver/images", "/docuserver/scans/quellen"};


  /*********************************************************
   *             Initialize global variables
   *********************************************************/
  public void init(ServletConfig config) throws ServletException {
    super.init(config);

    // first we need an Utils to setup ServletOps UGLY!!
    util = new Utils(5);
    // servletOps takes a ServletConfig to get the config file name
    servletOp = new ServletOps(util, config);
    // then we can start reading parameters UGLY!!

    // Utils instance with debuglevel
    int debugLevel = servletOp.tryToGetInitParam("debug-level", 10);
    util = new Utils(debugLevel);
    // reset Util for ServletOps instance
    servletOp.setUtils(util);
    // image file to send in case of error
    String errorImgFileName = servletOp.tryToGetInitParam("error-image", "/docuserver/images/icons/scalerror.gif");
    errorImgFile = new File(errorImgFileName);
    // image file to send if access is denied
    String denyImgFileName = servletOp.tryToGetInitParam("denied-image", "/docuserver/images/icons/denied.gif");
    denyImgFile = new File(denyImgFileName);
    // base directories in order of preference (prescaled versions first)
    String baseDirList = servletOp.tryToGetInitParam("basedir-list", "/docuserver/scaled/small:/docuserver/images:/docuserver/scans/quellen");
    // split list into directories
    baseDirs = servletOp.tryToGetPathArray(baseDirList, baseDirs);
    // use authentication information
    String useAuth = servletOp.tryToGetInitParam("use-authorization", "true");
    if ((useAuth.indexOf("false") > 0)||(useAuth.indexOf("FALSE") > 0)) {
      useAuthentication = false;
    } else {
      useAuthentication = true;
      try {
        // DB version
        //authOp = new DBAuthOpsImpl(util);
        // XML version
        String cnfPath = servletOp.tryToGetInitParam("auth-file", "/docuserver/www/digitallibrary/WEB-INF/digilib-auth.xml");
        authOp = new XMLAuthOps(util, cnfPath);
      } catch (AuthOpException e) {
        throw new ServletException(e);
      }
    }
    // FileOps instance
    fileOp = new FileOps(util);
    // global DocuImage instance (don't reuse inside a request!)
    globalImage = new JAIDocuImage(util);
//    globalImage = new JIMIDocuImage(util);
    //globalImage = new ImageLoaderDocuImage(util);

  }

  /**Process the HTTP Get request*/
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    util.dprintln(1, "The servlet has received a GET!");
    processRequest(request, response);
  }

  /**Process the HTTP Post request*/
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    util.dprintln(1, "The servlet has received a POST!");
    processRequest(request, response);
  }

  /**Clean up resources*/
  public void destroy() {
  }

/**********************************************************************
 *                       main request handler
 **********************************************************************/

  void processRequest(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException {

    // time for benchmarking
    long startTime = System.currentTimeMillis();
    // output mime/type
    String mimeType = "image/png";

    /**
     * parameters for a session
     */

    // scale the image file to fit window size
    boolean scaleToFit = true;
    // use heuristics (GIF?) to scale or not
    boolean forcedScale = false;
    // try prescaled images first
    boolean preScaledFirst = true;
    // interpolation to use for scaling
    int scaleQual = 0;
    // send html error message (or image file)
    boolean errorMsgHtml = false;

    /**
     *  request parameter
     */

    // file/dir to load
    String param_fn = servletOp.tryToGetParam("fn", "", request);
    // page number
    int param_pn = servletOp.tryToGetParam("pn", 1, request);
    // destination image width
    int param_dw = servletOp.tryToGetParam("dw", 300, request);
    // destination image height
    int param_dh = servletOp.tryToGetParam("dh", 400, request);
    // relative area x_offset (0..1)
    float param_wx = servletOp.tryToGetParam("wx", 0f, request);
    // relative area y_offset
    float param_wy = servletOp.tryToGetParam("wy", 0f, request);
    // relative area width (0..1)
    float param_ww = servletOp.tryToGetParam("ww", 1f, request);
    // relative area height
    float param_wh = servletOp.tryToGetParam("wh", 1f, request);
    // scale factor (additional to dw/width, dh/height)
    float param_ws = servletOp.tryToGetParam("ws", 1f, request);
    // operation mode: flags separated by "+"
    String param_mo = servletOp.tryToGetParam("mo", "", request);
    // operation mode: "fit": always fit to page, "file": send as-is
    if (param_mo.indexOf("fit") >= 0) {
      scaleToFit = true;
      forcedScale = true;
    } else if (param_mo.indexOf("file") >= 0) {
      scaleToFit = false;
      forcedScale = true;
    }
    // operation mode: "errtxt": error message in html, "errimg": error image
    if (param_mo.indexOf("errtxt") >= 0) {
      errorMsgHtml = true;
    } else if (param_mo.indexOf("errimg") >= 0) {
      errorMsgHtml = false;
    }
    // operation mode: "q0" - "q2": interpolation quality
    if (param_mo.indexOf("q0") >= 0) {
      scaleQual = 0;
    } else if (param_mo.indexOf("q1") >= 0) {
      scaleQual = 1;
    } else if (param_mo.indexOf("q2") >= 0) {
      scaleQual = 2;
    }
    // operation mode: "lores": try to use scaled image, "hires": unscaled image
    if (param_mo.indexOf("lores") >= 0) {
      preScaledFirst = true;
    } else if (param_mo.indexOf("hires") >= 0) {
      preScaledFirst = false;
    }

    Utils.dprintln(1, "Parameter values: fn:"+param_fn+" pn:"+param_pn+" dw:"+param_dw+" dh:"+param_dh+" wx:"+param_wx+" wy:"+param_wy+" ww:"+param_ww+" wh:"+param_wh+" ws:"+param_ws+" mo:"+param_mo);

    //"big" try for all file/image actions
    try {

    // DocuImage instance
    DocuImage docuImage = new JAIDocuImage(util);
//    DocuImage docuImage = new JIMIDocuImage(util);
    //DocuImage docuImage = new ImageLoaderDocuImage(util);


    /**
     *  find the file to load/send
     */

    String loadPathName = "";
    // if there's PathInfo, append
    if (request.getPathInfo() != null) {
      loadPathName += request.getPathInfo();
    }
    // append fn parameter
    loadPathName += param_fn;
    // if it's zoomed, try hires version (to be optimized...)
    if ((param_ww < 1f) || (param_wh < 1f)) {
      preScaledFirst = false;
    }

    if (useAuthentication) {
      // check permissions
      List rolesRequired = authOp.rolesForPath(loadPathName, request);
      if (rolesRequired != null) {
        Utils.dprintln(1, "Role required: "+rolesRequired);
        Utils.dprintln(2, "User: "+request.getRemoteUser());
        if (! authOp.isRoleAuthorized(rolesRequired, request)) {
          Utils.dprintln(1, "ERROR: access denied!");
          if (errorMsgHtml) {
            servletOp.htmlMessage("ERROR: Unauthorized access!", response);
          } else {
            docuImage.sendFile(denyImgFile, response);
          }
          return;
        }
      }
    }

    // find the file
    File fileToLoad = fileOp.getFileVariant(baseDirs, loadPathName, param_pn, preScaledFirst);

    Utils.dprintln(1, "Loading: "+fileToLoad);

    // get the source image type (if it's known)
    mimeType = fileOp.mimeForFile(fileToLoad);

    // if not forced and source is GIF/PNG then send-as-is if not zoomed
    if((!forcedScale && (mimeType == "image/gif" || mimeType == "image/png")
        && (param_ww == 1f) && (param_wh == 1f)) || (forcedScale && !scaleToFit)) {

      Utils.dprintln(1, "Sending File as is.");

      docuImage.sendFile(fileToLoad, response);

      Utils.dprintln(1, "Done in "+(System.currentTimeMillis()-startTime)+"ms");
      return;
    }

    // load file
    docuImage.loadImage(fileToLoad);

    /**
     *  crop and scale the image
     */

    // get size
    int imgWidth = docuImage.getWidth();
    int imgHeight = docuImage.getHeight();

    util.dprintln(2, "IMG: "+imgWidth+"x"+imgHeight);
    util.dprintln(2, "time "+(System.currentTimeMillis()-startTime)+"ms");

    // calculate absolute from relative coordinates
    float areaXoff = param_wx * imgWidth;
    float areaYoff = param_wy * imgHeight;
    float areaWidth = param_ww * imgWidth;
    float areaHeight = param_wh * imgHeight;
    // calculate scaling factors
    float scaleX = param_dw / areaWidth * param_ws;
    float scaleY = param_dh / areaHeight * param_ws;
    float scaleXY = (scaleX > scaleY) ? scaleY : scaleX;

    util.dprintln(1, "Scale "+scaleXY+"("+scaleX+","+scaleY+") on "+areaXoff+","+areaYoff+" "+areaWidth+"x"+areaHeight);

    // fit area to image
    areaWidth = (areaXoff + areaWidth > imgWidth) ? imgWidth - areaXoff : areaWidth;
    areaHeight = (areaYoff + areaHeight > imgHeight) ? imgHeight - areaYoff : areaHeight;

    util.dprintln(2, "cropped: "+areaXoff+","+areaYoff+" "+areaWidth+"x"+areaHeight);

    // check image parameters
    if ((areaWidth < 1)||(areaHeight < 1)
       ||(scaleXY * areaWidth < 2)||(scaleXY * areaHeight < 2)) {
      Utils.dprintln(1, "ERROR: invalid scale parameter set!");
      throw new ImageOpException("Invalid scale parameter set!");
    }

    // crop and scale image
    docuImage.cropAndScale((int)areaXoff, (int)areaYoff, (int)areaWidth, (int)areaHeight,
                            scaleXY, scaleQual);

    util.dprintln(2, "time "+(System.currentTimeMillis()-startTime)+"ms");

    /**
     *  write the resulting image
     */

    // setup output -- if source is JPG then dest will be JPG else it's PNG
    if (mimeType != "image/jpeg") {
      mimeType="image/png";
    }

    // write the image
    docuImage.writeImage(mimeType, response);

    util.dprintln(1, "Done in "+(System.currentTimeMillis()-startTime)+"ms");

    /**
     *  error handling
     */

    }//"big" try
    catch (FileOpException e) {
      util.dprintln(1, "ERROR: File IO Error: "+e);
      try {
        if (errorMsgHtml) {
          servletOp.htmlMessage("ERROR: File IO Error: "+e, response);
        } else {
          globalImage.sendFile(errorImgFile, response);
        }
      } catch (FileOpException ex) {} // so we don't get a loop
      return;
    }
    catch (AuthOpException e) {
      Utils.dprintln(1, "ERROR: Authorization error: "+e);
      try {
        if (errorMsgHtml) {
          servletOp.htmlMessage("ERROR: Authorization error: "+e, response);
        } else {
          globalImage.sendFile(errorImgFile, response);
        }
      } catch (FileOpException ex) {} // so we don't get a loop
      return;
    }
    catch (ImageOpException e) {
      Utils.dprintln(1, "ERROR: Image Error: "+e);
      try {
        if (errorMsgHtml) {
          servletOp.htmlMessage("ERROR: Image Operation Error: "+e, response);
        } else {
          globalImage.sendFile(errorImgFile, response);
        }
      } catch (FileOpException ex) {} // so we don't get a loop
      return;
    }

  }

}//Scaler class
