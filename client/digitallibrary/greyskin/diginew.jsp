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
	
	<style type="text/css">

		body		{ background-color: #E0E0E0; color: black; font-size: 8pt }
		code		{ font-family: monospace; color: blue; }
		pre		{ color: #006060; }

		a.icon		{ margin: 0px; padding: 0px; }

		img.png 	{ border: none; }
        img.png:hover { background-image: url('corona.png'); }
		img.mark 	{ border: none; }

		div.button	{ padding: 0px; }
		div.dot		{ position: absolute; left: -20; top: 100; visibility: hidden }	
		div#scaler-table { padding-right: 40px; }

		div#buttons	{ position: absolute; right: 5px; top: 5px; background-color: #E0E0E0; }
		div#dloptions	{ position: absolute; right: 5px; top: 5px; background-color: #E0E0E0; visibility: hidden; }
		div#zoom	{ position: absolute; border: 2px solid red; visibility: hidden; }
		
	</style>
	
	<script type="text/javascript" src="baselib.js"></script>
	
	<script type="text/javascript" src="dllib.js"></script>

	<script language="JavaScript">
		var isOptionDivVisible = false;
		var dlTarget = window.name;
		var baseUrl = '<%= dlRequest.getAsString("base.url") %>';
		var toolbarEnabledURL = window.location.href;

		function resetParams() {
			newParameter('fn', '', 1);
			newParameter('pn', '1', 1);
			newParameter('ws', '1.0', 1);
			newParameter('mo', '', 1);
			newParameter('mk', '', 3);
			newParameter('wx', '0.0', 2);
			newParameter('wy', '0.0', 2);
			newParameter('ww', '1.0', 2);
			newParameter('wh', '1.0', 2);
			newParameter('pt', '<%= dlRequest.getAsString("pt") %>', 1);
			newParameter('brgt', '0.0', 1);
			newParameter('cont', '0.0', 1);
			newParameter('rot', '0.0', 1);
			newParameter('rgba', '', 1);
			newParameter('rgbm', '', 1);
			newParameter('ddpix', '', 1);
			newParameter('ddpiy', '', 1);
			document.id='digilib';
			}
		

		function toggleOptionDiv() {
			isOptionDivVisible = !isOptionDivVisible;
			showOptions(isOptionDivVisible);
			}

		function highlightPNG(id, on) {
			var img = document.getElementById(id);
			var a = img.parentNode
			var div = a.parentNode;
			var src = img.src;
			// FIXME: IE - transparente PNGs offenbar nicht nachladbar
			
			// if (browserType.isIE)
			//	img.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src + "');"
			div.style.backgroundImage = on 
				? "url('corona.png')"
				: "";
		}

		// initialize image; called by body.onload
		function onBodyLoaded() {
			var scaler = getElement('scaler');
			var pic = getElement('pic');
			var ps = bestPicSize(scaler, 50);
			var src = "../servlet/Scaler?" + getQueryString() + "&dw=" + ps.width + "&dh=" + ps.height;
			pic.src = src;
			dl_init();	// dl_init braucht die endgültigen Maße des pic Elements
			}
		
		base_init();		// browser recognition
		resetParams();		// default values
		dl_param_init();	// parse parameter values
			
	</script>
</head>

<body onload="onBodyLoaded();">

 <!-- slot for the scaled image -->
 <div id="scaler-table">
 	<div id="scaler" style="visibility:visible">
		<img id="pic"></img>
	</div>
 </div>

 <!-- slot for the zoom -->
 <div id="zoom">
 </div>

 <!-- marks as dynamically created divs with numbers or text? -->
 <div id="dot0" class="dot"><img class="mark" src="../img/mark1.gif" ></div>
 <div id="dot1" class="dot"><img class="mark" src="../img/mark2.gif" ></div>
 <div id="dot2" class="dot"><img class="mark" src="../img/mark3.gif" ></div>
 <div id="dot3" class="dot"><img class="mark" src="../img/mark4.gif" ></div>
 <div id="dot4" class="dot"><img class="mark" src="../img/mark5.gif" ></div>
 <div id="dot5" class="dot"><img class="mark" src="../img/mark6.gif" ></div>
 <div id="dot6" class="dot"><img class="mark" src="../img/mark7.gif" ></div>
 <div id="dot7" class="dot"><img class="mark" src="../img/mark8.gif" ></div>

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
			href="javascript:help()"
			>

			<img
				class="png"
				id="help"

				title="help"
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
			href="javascript:setMark()"
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
				id="mirror-h"

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
				id="mirror-v"

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
				id="rotate"

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
				id="brightness"

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
				id="contrast"

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

</body>

</html>
