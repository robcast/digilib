<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2001 - 2013 digilib Community
  %%
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as 
  published by the Free Software Foundation, either version 3 of the 
  License, or (at your option) any later version.
  
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Lesser Public License for more details.
  
  You should have received a copy of the GNU General Lesser Public 
  License along with this program.  If not, see
  <http://www.gnu.org/licenses/lgpl-3.0.html>.
  #L%
  --%><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
      "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<%@ page language="java" pageEncoding="UTF-8"%><%!
	// -- JSP init -------------
	
	// create DocumentBean instance for all JSP requests
	digilib.servlet.DigilibBean docBean = new digilib.servlet.DigilibBean();
	
	// initialize DocumentBean instance in JSP init
	public void jspInit() {
	    try {
            // set servlet init-parameter
		    docBean.setConfig(getServletConfig());
	    } catch (javax.servlet.ServletException e) {
		    System.out.println(e);
	    }
	}
	// -- end of JSP init -------------
%><%
	// -- JSP request -------------
	
	// parsing the query
	// -----------------
	digilib.conf.DigilibServletRequest dlRequest = new digilib.conf.DigilibServletRequest(request);
	docBean.setRequest(dlRequest);
	// add number of pages
	dlRequest.setValue("pt", docBean.getNumPages());
	// store objects for jsp:include
	pageContext.setAttribute("docBean", docBean, pageContext.REQUEST_SCOPE);

%><html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<title>Digital Document Library NG</title>
	
	<link rel="stylesheet" type="text/css" href="diginew.css" />
	
<!-- <script type="text/javascript" src="debug.js"></script> -->

	<script type="text/javascript" src="baselib.js"></script>
	
	<script type="text/javascript" src="dllib.js"></script>

	<script language="JavaScript">

	var jspVersion = "diginew.jsp 1.023";
	var cookie = new Cookie();
	// alert(strObject(cookie));

	var isOptionDivVisible = cookie.getbool("isOptionDivVisible");
	var isBirdDivVisible = cookie.getbool("isBirdDivVisible");
	var isAboutDivVisible = false;
	var isSizeMenuVisible = false;
    var isScaleMenuVisible = false;
	var isOriginalSize = false;
	var isPixelByPixel = false;
	var dlTarget = window.name;
	var baseUrl = '<%= dlRequest.getAsString("base.url") %>';
	var toolbarEnabledURL = window.location.href;
	var waited = 0;

	function toggleOptionDiv() {
		isOptionDivVisible = !isOptionDivVisible;
		cookie.addbool("isOptionDivVisible", isOptionDivVisible);
		showOptions(isOptionDivVisible);
		}

	function toggleBirdDiv() {
		isBirdDivVisible = !isBirdDivVisible;
		cookie.addbool("isBirdDivVisible", isBirdDivVisible);
		showBirdDiv(isBirdDivVisible);
		}

	function toggleAboutDiv() {
		isAboutDivVisible = !isAboutDivVisible;
		showAboutDiv(isAboutDivVisible);
		}

	function toggleSizeMenu() {
		isSizeMenuVisible = !isSizeMenuVisible;
		showMenu("size-menu", "size", isSizeMenuVisible);
		}

    function toggleScaleMenu() {
        isScaleMenuVisible = !isScaleMenuVisible;
        showMenu("scale-menu", "scale", isScaleMenuVisible);
        }

	function setOnImage(id, src, value) {
	// replace img src and display "on" status
		var elem = getElement(id);
		elem.src = src;
		if (value)
			elem.title += ": " + value;
		else
			elem.title += ": on";
		}

	// change icons if image functions are on
	function reflectImageStatus() {
		if (hasFlag("hmir")) setOnImage("hmir", "mirror-horizontal-on.png");
		if (hasFlag("vmir")) setOnImage("vmir", "mirror-vertical-on.png");
		if (hasParameter("brgt"))
			setOnImage("brgt", "brightness-on.png", getParameter("brgt"));
		if (hasParameter("cont"))
			setOnImage("cont", "contrast-on.png", getParameter("cont"));
		if (hasParameter("rot"))
			setOnImage("rot", "rotate-on.png", getParameter("rot"));
		if (hasParameter("rgb"))
			setOnImage("rgb", "rgb-on.png", getParameter("rgb"));
		}
    

	// initialize digilib; called by body.onload
	function onBodyLoad() {
		document.id = 'digilib';
        dl.onLoad();
        dl.showOptions(isOptionDivVisible);
        reflectImageStatus(); // adjust icons
	}

	function onBodyUnload() {
		// alert(strObject(cookie));
		cookie.store();
		}

	</script>
</head>

<body onload="onBodyLoad();" onunload="onBodyUnload();">
 <!-- slot for the scaled image -->
 
 <div id="bg"></div>
 
 <div id="scaler">
	<img id="pic"></img>
 </div>

 <!-- sensitive overlay for zoom area etc -->
 <div id="overlay"></div>
 <div id="bird-overlay"></div>
 
 <!-- the zoom area selection rectangle -->
 <div id="zoom"></div>
 
 <!-- the bird's eye overview image -->
 <img id="bird-image"></img>

 <!-- the bird's eye select area -->
 <div id="bird-area"></div>

 <!-- the arrows -->
 <a class="arrow" id="up"    href="javascript:moveBy(0, -0.5)"><img style="border: 0px; width: 100%; height: 100%;" src="trans.gif"/></a>
 <a class="arrow" id="down"  href="javascript:moveBy(0, 0.5)"><img style="border: 0px; width: 100%; height: 100%;" src="trans.gif"/></a>
 <a class="arrow" id="left"  href="javascript:moveBy(-0.5, 0)"><img style="border: 0px; width: 100%; height: 100%;" src="trans.gif"/></a>
 <a class="arrow" id="right" href="javascript:moveBy(0.5, 0)"><img style="border: 0px; width: 100%; height: 100%;" src="trans.gif"/></a>

 <!-- the about window -->
 <div id="about" class="about" onclick="toggleAboutDiv()">
 	<p>Digilib Graphic Viewer</p>
 	<a href="http://digilib.berlios.de" target="_blank" >
 		<img class="logo" src="../img/digilib-logo-text1.png" title="digilib"></img>
	</a>
	<p id="digilib-version"></p>
	<p id="jsp-version"></p>
	<p id="baselib-version"></p>
	<p id="dllib-version"></p>
 </div>

 <!-- the calibration div -->
 <div id="calibration">
 	<div>
 	<p class="cm">measure the length of this scale on your screen</p>
	</div>
 </div>

 <!-- the size menu -->
 <div id="size-menu" class="popup-menu">
	<p><a href="javascript:setSize(1)">1 x</a></p>
	<p><a href="javascript:setSize(1.41)">1.41 x</a></p>
	<p><a href="javascript:setSize(2)">2 x</a></p>
	<p><a href="javascript:setSize(3)">3 x</a></p>
	<div id="sizes-bar">
		<div id="sizes-slider"></div>
	</div>
	<p id="sizes-value"></p>
 </div>

<!-- the scale menu -->
 <div id="scale-menu" class="popup-menu">
  <p><a href="javascript:setScale('fit')">fit to screen</a></p>
  <p><a href="javascript:setScale('pixel')">pixel by pixel</a></p>
  <p><a href="javascript:setScale('original')">original size</a></p>
 </div>

 <!-- the buttons -->
 <div id="buttons">
	<div class="separator">
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:getRefWin()"
			>

			<img
				class="png"
				id="reference"
				title="get a reference URL"
				src="reference.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:dl.zoomBy(1.4)"
			>

			<img
				class="png"
				id="zoom-in"
				title="zoom in"
				src="zoom-in.png"
			>
	</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:zoomBy(0.7)"
			>

			<img
				class="png"
				id="zoom-out"
				title="zoom out"
				src="zoom-out.png"
			>
	</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:zoomArea()"
			>

			<img
				class="png"
				id="zoom-area"
				title="zoom area"
				src="zoom-area.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:zoomFullpage()"
			>

			<img
				class="png"
				id="zoom-full"
				title="view the whole image"
				src="zoom-full.png"
			>
	</a> 
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:zoomFullpage('width')"
			>

			<img
				class="png"
				id="page-width"
				title="page width"
				src="pagewidth.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:gotoPage('-1')"
			>

			<img
				class="png"
				id="back"
				title="goto previous image"
				src="back.png"
			>
	</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:gotoPage('+1')"
			>

			<img
				class="png"
				id="fwd"
				title="goto next image"
				src="fwd.png"
			>
	</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:gotoPageWin()"
			>

			<img
				class="png"
				id="page"
				title="specify image"
				src="page.png"
			>
	</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:toggleBirdDiv()"
			>

			<img
				class="png"
				id="bird"
				title="show bird's eye view"
				src="birds-eye.png"
			>
		</a>
	</div>
	
	<div class="separator">
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:toggleAboutDiv()"
			>

			<img
				class="png"
				id="help"
				title="about Digilib"
				src="help.png"
			>
		</a>
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:resetImage()"
			>

			<img
				class="png"
				id="help"
				title="reset image"
				src="reset.png"
			>
		</a>
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:toggleOptionDiv()"
			>

			<img
				class="png"
				id="options"
				title="more options"
				src="options.png"
			>
		</a>
	</div>

	<div class="separator">
	</div>
</div>

<!-- options div -->

<div id="dloptions">
	<div class="separator">
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:setMark();"
			>

			<img
				class="png"
				id="mark"
				title="set a mark"
				src="mark.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:removeMark()"
			>

			<img
				class="png"
				id="delmark"
				title="delete the last mark"
				src="delmark.png"
				>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:mirror('h')"
			>

			<img
				class="png"
				id="hmir"
				title="mirror horizontally"
				src="mirror-horizontal.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:mirror('v')"
			>

			<img
				class="png"
				id="vmir"
				title="mirror vertically"
				src="mirror-vertical.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('rot', 'Rotate (0..360) clockwise')"
			>

			<img
				class="png"
				id="rot"
				title="rotate image"
				src="rotate.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('brgt', 'Brightness (-255..255)')"
			>

			<img
				class="png"
				id="brgt"
				title="set brightness"
				src="brightness.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('cont', 'Contrast (0..8)')"
			>

			<img
				class="png"
				id="cont"
				title="set contrast"
				src="contrast.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('rgb', '...')"
			>

			<img
				class="png"
				id="rgb"
				title="set rgb values"
				src="rgb.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setQualityWin('Quality (0..2)')"
			>

			<img
				class="png"
				id="quality"
				title="set image quality"
				src="quality.png"
			>
		</a>
	</div>
	
  <div class="button">
    <a
      class="icon"
      href="javascript:toggleSizeMenu()"
      >

      <img
        class="png"
        id="size"
        title="set page size"
        src="size.png"
      >
    </a>
  </div>

	<div class="button">
		<a
			class="icon"
			href="javascript:calibrate('x')"
			>

			<img
				class="png"
				id="calibration-x"
				title="calibrate screen x-ratio"
				src="calibration-x.png"
			>
		</a>
	</div>
  
	<div class="button">
		<a
			class="icon"
			href="javascript:toggleScaleMenu()"
			>

			<img
				class="png"
				id="scale"
				title="change image scale"
				src="original-size.png"
			>
		</a>
	</div>

	<div class="separator">
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:toggleOptionDiv()"
			>

			<img
				class="png"
				id="options-1"
				title="hide options"
				src="options.png"
			>
		</a>
	</div>

	<div class="separator">
	</div>

</div>

<div class="debug" id="debug"><p class="debug">Debug</p></div>

</body>

</html>
