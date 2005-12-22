<%@ page language="java" %><%!
	// -- JSP init -------------
	
	// create DocumentBean instance for all JSP requests
	digilib.servlet.DocumentBean docBean = new digilib.servlet.DocumentBean();
	
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
%>

<%
	// -- JSP request -------------
	
	// parsing the query
	// -----------------
	digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
	docBean.setRequest(dlRequest);
	// check if authentication is needed and redirect if necessary
	docBean.doAuthentication(response);
	// add number of pages
	dlRequest.setValue("pt", docBean.getNumPages());
	// store objects for jsp:include
	pageContext.setAttribute("docBean", docBean, pageContext.REQUEST_SCOPE);
%>

<html>

<head>
	<title>Digital Document Library NG</title>
	
	<link rel="stylesheet" type="text/css" href="diginew.css" />
	
	<script type="text/javascript" src="debug.js"></script>

	<script type="text/javascript" src="baselib.js"></script>
	
	<script type="text/javascript" src="dllib.js"></script>

	<script language="JavaScript">

	var isOptionDivVisible = false;
	var isAboutDivVisible = false;
	var isBirdDivVisible = false;
	var dlTarget = window.name;
	var baseUrl = '<%= dlRequest.getAsString("base.url") %>';
	var toolbarEnabledURL = window.location.href;
	var timeOut;

	function toggleOptionDiv() {
		isOptionDivVisible = !isOptionDivVisible;
		showOptions(isOptionDivVisible);
		}

	function toggleAboutDiv() {
		isAboutDivVisible = !isAboutDivVisible;
		showAboutDiv(isAboutDivVisible);
		}

	function toggleBirdDiv() {
		isBirdDivVisible = !isBirdDivVisible;
		showBirdDiv(isBirdDivVisible);
		}

	// replace img src and display "on" status
	function setOnImage(id, src) {
		var elem = getElement(id);
		elem.src = src;
		elem.title += ": on";
		}

	// change icons if image functions are on
	function reflectImageStatus() {
		if (hasFlag("hmir")) setOnImage("hmir", "mirror-horizontal-on.png");
		if (hasFlag("vmir")) setOnImage("vmir", "mirror-vertical-on.png");
		if (hasParameter("brgt")) setOnImage("brgt", "brightness-on.png");
		if (hasParameter("cont")) setOnImage("cont", "contrast-on.png");
		if (hasParameter("rot")) setOnImage("rot", "rotate-on.png");
		if (hasParameter("rgb")) setOnImage("rgb", "rgb-on.png");
		}
		
	// initialize image; called by body.onload
	function onBodyLoaded() {
		document.id = 'digilib';
		initParameters();	// load default values and detail
		dl_param_init();	// parse parameter values
		loadScalerImage();	// ruft auch dl_init() / initScaler auf
		loadBirdImage();	// lädt das Bird's Eye Bild
		reflectImageStatus();	// adjust icons
		showArrows();		// show arrow overlays for zoom navigation
		moveCenter();		// click to move point to center
		}

	// base_init();		// now done on loading baselib.js

	</script>
</head>

<body onload="onBodyLoaded();">

 <!-- slot for the scaled image -->
 <div id="scaler-table">
 	<div id="scaler">
		<img id="pic"></img>
	</div>
 </div>

 <!-- sensitive overlay for zoom area etc -->
 <div id="overlay">
 </div>
 
 <!-- the zoom area selection rectangle -->
 <div id="zoom">
 </div>
 
 <!-- the bird's eye overview image -->
 <img id="bird-image"></img>

 <!-- the bird's eye select area -->
 <div id="bird-area">
 </div>
 
 <!-- the arrows -->
 <a class="arrow" id="up"    href="javascript:moveBy(0, -0.5)"></a>
 <a class="arrow" id="down"  href="javascript:moveBy(0, 0.5)"></a>
 <a class="arrow" id="left"  href="javascript:moveBy(-0.5, 0)"></a>
 <a class="arrow" id="right" href="javascript:moveBy(0.5, 0)"></a>

 <!-- the about window -->
 <div id="about" class="about" onclick="toggleAboutDiv()">
 	<p>Digilib Graphic Viewer</p>
 	<a href="http://digilib.berlios.de" target="_blank" >
 		<img class="logo" src="../img/digilib-logo-text1.png" title="digilib"></img>
	</a>
	<p id="digilib-version"></p>
	<p id="baselib-version"></p>
	<p id="dllib-version"></p>
 </div>


 <div id="buttons">
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
			href="javascript:zoomBy(1.4)"
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

</div>

<!-- options div -->

<div id="dloptions">
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
			href="javascript:setParamWin('size', '...')"
			>

			<img
				class="png"
				id="size"
				title="resize page"
				src="size.png"
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
			href="javascript:pixelByPixel()"
			>

			<img
				class="png"
				id="pixel-by-pixel"
				title="view image pixel by pixel"
				src="pixel-by-pixel.png"
			>
		</a>
	</div>

	<div class="button">
		<a
			class="icon"
			href="javascript:originalSize()"
			>

			<img
				class="png"
				id="original-size"
				title="view image in original size"
				src="original-size.png"
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
				id="options-1"
				title="hide options"
				src="options.png"
			>
		</a>
	</div>
</div>

<div class="debug" id="debug"><p class="debug">Debug</p></div>

</body>

</html>
