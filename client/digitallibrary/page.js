function pageInfo() {
	
	// bug in netscape 4.xx (confunding px and pt)
	var fontsize = document.layers ? "11pt" : "11px";

	if (pageFrame) {
		pageFrame.document.open();
		pageFrame.document.write('<html><head></head><body bgcolor="#CCCCCC" topmargin="5" marginheight="5">');
		pageFrame.document.write('<p style="font-family: Verdana, Arial, Helvetica, sans-serif; text-align: center; color: #CC3333; font-size: ' + fontsize + '">');
		pageFrame.document.write(att[1] + '<b> of </b>' + numPages + '</p></body></html>');
		pageFrame.document.close();
	}
}
