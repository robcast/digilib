include ('chrome://jslib/content/io/dir.js');
include ('chrome://jslib/content/io/file.js');
/*include ('chrome://jslib/content/io/rdfBase.js');
include ('chrome://jslib/content/io/rdfResource.js');
include ('chrome://jslib/content/io/rdfContainer.js');*/
include ('chrome://jslib/content/io/rdf.js');/*
include ('chrome://jslib/content/io/rdfFile.js');*/
include ('chrome://jslib/content/io/fileUtils.js');

/* Konstanten */
var  BEGIN_OF_URI = 'urn:echo';
var  TREE_ID = 'annotation_tree';
var  ECHO = 'http://echo.unibe.ch/digilib/rdf#';
var  HEADER_URI = 'urn:header:';

var slash='/';
if (navigator.platform=="Win32"){
   slash='\\';
}

var directory=slash;
var digilib_path=slash;
var creator = 'unknown';
var rdfTree;

getProfile();
getAnnotations();


/**
 * Opens a Dialog to make a text annotation.
 */
function dialog_annotate() {
    if(this.getAttributeOfSelectedNode('url') != '') {
	    window.openDialog("chrome://alcatraz/content/dialog_annotate.xul", "dialog_annotate",       "chrome,dialog,resizable=no", "");
	} else {
        alert('No Annotation is selected!');
	}
}


function makePathCompatible(path){
  if (navigator.platform=="Win32"){
    // slash durch backslash ersetzten
    path=path.replace(/\//g,"\\");
    // nur 2 backslashs am anfang
    path=path.replace(/^\\{3}/,"\\\\");
    // vor Laufwerkbuchstaben kein Backslash
    if (path.indexOf(":")>0){
      path=path.replace(/^\\/g,"");
    }
    // nur ein Slash gibt Absturz
    path=path.replace(/^\\$/,"c:\\");
    //alert(path);
  }
  return path;
}

function file_open(){
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp = Components.classes["@mozilla.org/filepicker;1"]
        .createInstance(nsIFilePicker);
  fp.init(window, "Select a Directory", nsIFilePicker.modeGetFolder);

  // set default directory
  var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  directory=makePathCompatible(directory);
  aLocalFile.initWithPath(directory);
  fp.displayDirectory=aLocalFile;

  var res=fp.show();
  if (res==nsIFilePicker.returnOK){
    directory=fp.fileURL.path;
    directory=makePathCompatible(directory);
    this.setTreeDirectory();
  }
}

function setTreeDirectory(){
	this.rdfTree = new RDFTree(this.TREE_ID);
	this.rdfTree.addDataSource('file://'+this.getProfileDirectory()+slash+'annotations.rdf');
}

function setCreatorName() {

}

function refreshTree(){
	this.rdfTree = new RDFTree(this.TREE_ID);
	this.rdfTree.doSort('name');
	this.rdfTree.rebuild();
}

function getAttributeOfSelectedNode(attribute) {
	this.rdfTree = new RDFTree(this.TREE_ID);
	var tree = this.rdfTree.tree;
    try {
		return tree.view.getCellText(tree.currentIndex,attribute);
    } catch(e) {
		return '';
	}
}

function getURIOfSelectedNode() {
    var url = this.getAttributeOfSelectedNode('url');
	if(url != '') {
        return id = this.BEGIN_OF_URI + ':' + url
	        + '|' + this.getAttributeOfSelectedNode('pagenumber')
		    + '|' + this.getAttributeOfSelectedNode('name');
	}
    return '';
}

/**
 * Deletes the selected Annotation
 */
function deleteAnnotation() {
    var name = this.getAttributeOfSelectedNode('name');
    if(name != '') {
	    var isSure = window.confirm('Do you really want to delete the Annotations "'
		    + name + '?');
		if(isSure) {
			var dataSource = new RDFDataSource('file://'+this.getProfileDirectory()+slash+'annotations.rdf');
			containerNode = dataSource.getNode(this.BEGIN_OF_URI);
			var uri = this.getURIOfSelectedNode();
			containerNode.removeChild(dataSource.getNode(uri));
//            alert(this.HEADER_URI+this.getURIOfSelectedNode());
			//alert(uri);
			dataSource.deleteRecursive(this.HEADER_URI+uri); // Delete the Header
			dataSource.deleteRecursive(uri);
			this.refreshTree();
			dataSource.save();
		}
	}

}

/**
 * Adds a Textannotation to an existing annotation.
 */
function addTextAnnotation(text) {
    var id = this.getURIOfSelectedNode();
	dataSource = new RDFDataSource('file://'+this.getProfileDirectory()+slash+'annotations.rdf');
    var node = dataSource.getNode(id);
	if(node.propertyExists('http://purl.org/dc/elements/1.0/title')) {
        /** Do something */
	} else { // Should never be reached
        alert('AddTextAnnotation: No Annotation is selected!');
    }
    //alert(text);
}

function getCurrentDate() {
	var now = new Date();
	return date = ((now.getYear() < 999) ? (now.getYear()+1900) : now.getYear()) + '-'
		+now.getDate() + '-' + now.getDay() + ', '
		+now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + ' '
		+(now.getTimezoneOffset()/60) + ':00 GMT';
}

/**
 * Creates A Complex RDF entry and adds it to the base Container.
 * @params String The urn of the new node without(!) title (so far).
 * @todo isn't complex yet...
 */
function createComplexRDFEntry(inCompleteURN) {
    var title = window.prompt("Please enter a title for this Annotation"
	    ,this.getAttributeOfSelectedNode('name'));
	if(title != null) {
		var completeURN = inCompleteURN+title;
		var echoContainer = dataSource.getNode(BEGIN_OF_URI);
		echoContainer.makeSeq();

		echoContainer.addChild(completeURN);
/*		var node = dataSource.getNode(completeURN);
		node.addTarget(ECHO + 'template','text_digilib');
		node.addTarget(ECHO + 'echo','basic');
		node.addTarget(ECHO + 'lv","1");
		node.addTarget("http://purl.org/dc/elements/1.0/title",title);
		node.addTarget("http://purl.org/dc/elements/1.0/creator","");
		node.addTarget("http://purl.org/dc/elements/1.0/date","");
		node.addTarget("http://www.w3.org/2000/10/annotation-ns#created","");
		node.addTarget("http://www.w3.org/1999/02/22-rdf-syntax-ns#type",'Annotation');

		var arrayParams=window.content.listParameters();

        var s = '';
		for (i=0; i< arrayParams.length; i++){
		    s += arrayParams[i] + ' ' + window.content.getParameter(arrayParams[i]) + '\n';
			//var value=window.content.getParameter(arrayParams[i]);
			//alert(arrayParams[i]+":"+value);
			//node.addTarget(ECHO + '+arrayParams[i],value);
		}
		alert(s);

		node.addTarget(ECHO + 'lv',"1");
		node.addTarget("http://purl.org/dc/elements/1.0/title",title);
		node.addTarget("http://purl.org/dc/elements/1.0/creator","");
		node.addTarget("http://purl.org/dc/elements/1.0/date","");
		node.addTarget("http://www.w3.org/2000/10/annotation-ns#created","");
		//node.addTarget("http://www.w3.org/2000/10/annotation-ns#Annotation","targetof");
		//var node2 = dataSource.getNode("targetof");
		//node2.addTarget(ECHO + 'lv',"1");
*/
		var date = this.getCurrentDate();
		var node = dataSource.getNode(this.HEADER_URI + completeURN);
		var created = '';
		/** @Todo Doesn't work correctly, if the selected one isn't the overwritten one! */
		if(!node.propertyExists('http://purl.org/dc/elements/1.0/title')) {
            created = date;
		} else {
            created = this.getAttributeOfSelectedNode('created');
		}
		var fn = window.content.getParameter('fn');
		var pn = window.content.getParameter('pn');
		var ws = window.content.getParameter('ws');
		var mk = window.content.getParameter('mk');
		var wx = window.content.getParameter('wx');
		var wy = window.content.getParameter('wy');
		var ww = window.content.getParameter('ww');
		var wh = window.content.getParameter('wh');
		var pt = window.content.getParameter('pt');

		var brgt = window.content.getParameter('brgt');
		var cont = window.content.getParameter('cont');
		var rot = window.content.getParameter('rot');
		var rgba = window.content.getParameter('rgba');
		var rgbm = window.content.getParameter('rgbm');
		var ddpix = window.content.getParameter('ddpix');
		var ddpiy = window.content.getParameter('ddpiy');

		var lv = 1; /** @todo get the parameter right */


		var rdfHeader = '<?xml version="1.0" ?>\n'
				+'<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n'
				+'      xmlns:echo="' + ECHO + '"\n'
				+'      xmlns:a="http://www.w3.org/2000/10/annotation-ns#"\n'
				+'      xmlns:d="http://purl.org/dc/elements/1.0/">\n\n'
		var rdfFooter = '</RDF:RDF>\n';

		var rdf = rdfHeader;
		if(true) { // annotation is basic
			rdf += '  <RDF:Description RDF:about="' + completeURN + '">\n'
				+  '    <!-- Annotations Type -->\n'
				+  '    <RDF:type rdf:resource="http://www.w3.org/2000/10/annotation-ns#Annotation"/>\n'
				+  '    <echo:type rdf:resource="' + ECHO + 'Digilib"/>\n' //echo -> RDF
				+  '    <!-- Echo Digilib Parameters -->\n'
				+  '    <echo:fn>' + fn + '</echo:fn>\n'
				+  '    <echo:pn>' + pn + '</echo:pn>\n'
				+  '    <echo:ws>' + ws + '</echo:ws>\n'
				+  '    <echo:mk>' + mk + '</echo:mk>\n' // As there isn't a textmark yet, I only set mk
				+  '    <echo:wx>' + wx + '</echo:wx>\n'
				+  '    <echo:wy>' + wy + '</echo:wy>\n'
				+  '    <echo:ww>' + ww + '</echo:ww>\n'
				+  '    <echo:wh>' + wh + '</echo:wh>\n'
				+  '    <echo:pt>' + pt + '</echo:pt>\n'
				+  '    <echo:brgt>' + brgt + '</echo:brgt>\n'
				+  '    <echo:cont>' + cont + '</echo:cont>\n'
				+  '    <echo:rot>' + rot + '</echo:rot>\n'
				+  '    <echo:rgba>' + rgba + '</echo:rgba>\n'
				+  '    <echo:rgbm>' + rgbm + '</echo:rgbm>\n'
				+  '    <echo:ddpix>' + ddpix + '</echo:ddpix>\n'
				+  '    <echo:ddpiy>' + ddpiy + '</echo:ddpiy>\n'
				+  '    <echo:lv>' + lv + '</echo:lv>\n'
				+  '    <!-- Dublin Core -->\n'
				+  '    <d:title>' + title + '</d:title>\n'
				+  '    <d:creator>' + creator + '</d:creator>\n'
				+  '    <d:date>' + date + '</d:date>\n'
				+  '    <!-- WWW.W3.org Annotations -->\n'
				+  '    <a:created>' + created + '</a:created>\n'
				+  '  </RDF:Description>\n';
		} else { // annotation is complex /** @Todo The other components aren't correct yet*/

			rdf +='  <RDF:Description RDF:about="' + this.HEADER_URI + completeURN + '">\n'
				+ '    <RDF:type rdf:resource="http://www.w3.org/2000/10/annotation-ns#Annotation"/>\n'
				+ '    <echo:template>text_digilib</echo:template>\n' // are there other templates?
				+ '    <!-- Dublin Core -->\n'
				+ '    <d:title>' + title + '</d:title>\n'
				+ '    <d:creator>' + creator + '</d:creator>\n'
				+ '    <d:date>' + date + '</d:date>\n'
				+ '    <!-- WWW.W3.org Annotations -->\n'
				+ '    <a:created>' + created + '</a:created>\n';

			rdf +='    <echo:type rdf:resource="' + ECHO + 'complex"/>\n'; //echo -> RDF
				+ '    <echo:annotation RDF:resource="' + completeURN +'"/>\n'
				+ '  </RDF:Description>\n\n';
		}

		rdf += rdfFooter;
        //alert(rdf);
        var ds = new RDFDataSource();

		//Remove the original to add the new one
		dataSource.deleteRecursive(this.HEADER_URI+completeURN);
		ds.parseFromString(rdf,'file://'+this.getProfileDirectory()+slash+'annotations.rdf');
		ds.copyAllToDataSource(dataSource);

/*******************************************************

		var rdf ='<?xml version="1.0" ?>'
				+'<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#"'
				+'      xmlns:echo="' + ECHO + '"'
				+'      xmlns:a="http://www.w3.org/2000/10/annotation-ns#"'
				+'      xmlns:d="http://purl.org/dc/elements/1.0/">'

				+'  <RDF:Description rdf:about="'+completeURN+'">'
				+'    <echo:template>text_digilib</echo:template>'
				+'    <echo:type rdf:resource="' + ECHO + 'complex"/>' //echo -> RDF
				+'    <RDF:type rdf:resource="http://www.w3.org/2000/10/annotation-ns#Annotation"/>'
				+'    <echo:annotation>'
				+'      <RDF:Description>'
				+'      <!-- Annotations Type -->'
				+'      <RDF:type rdf:resource="http://www.w3.org/2000/10/annotation-ns#Annotation"/>'
				+'      <echo:type rdf:resource="' + ECHO + 'Digilib"/>' //echo -> RDF
				+'      <!-- Echo Digilib Parameters -->'
				+'      <echo:fn>histbot/botany</echo:fn>'
				+'      <echo:pn>1</echo:pn>'
				+'      <echo:ws>1.0</echo:ws>'
				+'      <echo:text_mark echo:mk="0.6021/0.8411">'
				+'        <RDF:Description>'
				+'            <!-- Annotations Type -->'
				+'            <RDF:type rdf:resource="http://www.w3.org/2000/10/annotation-ns#Annotation" />'
				+'            <echo:type rdf:resource="' + ECHO + 'Text" />'//echo -> RDF
				+'            <!-- Alcatraz Text -->'
				+'            <echo:txt>Mark 1 shows the root of the Anthoxanthum odoratum &lt;br /&gt; there is a lot of textand textt and text and text and text</echo:txt>'
				+'            <!-- Dublin Core -->'
				+'            <d:title>Text Annotation of Mark1</d:title>'
				+'            <d:creator>erwin.mueller@philo.unibe.ch</d:creator>'
				+'            <d:date>2003-07-11T19:13:52+01:00</d:date>'
				+'            <!-- WWW.W3.org Annotations -->'
				+'            <a:created>2003-07-11T19:13:16+01:00</a:created>'
				+'        </RDF:Description>'
				+'      </echo:text_mark>'
				+'      <echo:wx>0.2626</echo:wx>'
				+'      <echo:wy>0.8123</echo:wy>'
				+'      <echo:ww>0.4747</echo:ww>'
				+'      <echo:wh>0.1484</echo:wh>'
				+'      <echo:pt>249</echo:pt>'
				+'      <echo:lv>1</echo:lv>'
				+'      <!-- Dublin Core -->'
				+'      <d:title>Ruchgras</d:title>'
				+'      <d:creator>daniel.engler@philo.unibe.ch</d:creator>'
				+'      <d:date>2003-05-11T16:42:52+01:00</d:date>'
				+'      <!-- WWW.W3.org Annotations -->'
				+'      <a:created>2003-05-11T16:34:16+01:00</a:created>'
				+'      </RDF:Description>'
				+'    </echo:annotation>' // rdf:resource="echo00765"/>'
				+'    <d:title>Complex Annotation Digilib and Text</d:title>'
				+'    <d:creator>karl.gerber@germ.unibe.ch</d:creator>'
				+'    <d:date>2003-01-13T19:13:52+01:00</d:date>'
				+'    <!-- WWW.W3.org Annotations -->'
				+'    <a:created>2003-01-13T19:13:16+01:00</a:created>'
				+'  </RDF:Description>'
				+'</RDF:RDF>';
		ds = new RDFDataSource();
		ds.parseFromString(rdf,"http://echo.unibe.ch/digilib/rdf/digilib.rdf");
		//alert('Beispiel einer komplexen Annotation:\n\n'+ds.serializeToString());
***************************************************************/
    }
}

/**
 * Saves the open echo-site in the annotation.rdf-file without asking.
 * @todo The <code>about</code> has to be modified if the URN's are changing!
 */
function quickSave() {
	var about='';
	try {
	    var identify;
	    try {
			identify = (typeof(window.content.identify()) != 'undefined')
				? window.content.identify() : false;
		} catch(e) {
            identify = false;
		}
			about = window.content.getParameter('fn');
			about += '|' + window.content.getParameter('pn') + '|';
	} catch (e){
		about = '';
	}
	if (about != ''){
	    //alert('Creator: '+this.creator);
		while(this.creator == 'unknown' || this.creator == '') {
			this.creator = window.prompt("Please enter a username:",this.creator);
		}
		this.setProfile();

		//URN isn't complete yet!
		var urn = BEGIN_OF_URI + ':' + about;
		//alert('Documentpath: '+documentpath);

		dataSource = new RDFDataSource('file://'+this.getProfileDirectory()+slash+'annotations.rdf');

		this.createComplexRDFEntry(urn);
		dataSource.save();
		refreshTree();

	} else{
		alert("Error: no alcatraz component. can't create an annotation.");
	}
}

/** @todo Allow the users to save their RDF-Files anywhere.
function saveAs(){

  // get Digilib-Parameter form Browser
  //alert(window.content.location.href);

 var documentpath='';
    try{
        documentpath=window.content.getParameter('fn');
		documentpath=documentpath.replace(':',';');
    }catch (e){
        documentpath='';
    }
    if (documentpath != ''){
        //documentpath=documentpath.replace(slash,':');
	    //alert(documentpath);
        var docPath = BEGIN_OF_URI + ':' + documentpath;

		var t=document.getElementById("file_tree");
		dataSource = new RDFDataSource();
		this.createComplexRDFEntry(docPath);

		//dataSource.save();
		//refreshTree();
     var nsIFilePicker = Components.interfaces.nsIFilePicker;
     var fp = Components.classes["@mozilla.org/filepicker;1"]
           .createInstance(nsIFilePicker);
     fp.init(window, "Select a File", nsIFilePicker.modeSave);

     // set default direcotry
     var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
     directory=makePathCompatible(directory);
     aLocalFile.initWithPath(directory);
     fp.displayDirectory=aLocalFile;

     fp.appendFilter("Annotations","*.rdf; *.RDF");
     var res=fp.show();
     if (res==nsIFilePicker.returnOK){
       var thefile=fp.file;
       // --- do something with the file here ---
       //alert(fp.file);
       //alert(fp.fileURL.path);

       var strFilePath=fp.file.path;
       strFilePath=strFilePath.toLowerCase();
       if (strFilePath.indexOf('.rdf')<0){
          strFilePath=fp.fileURL.path+".rdf";
       }else{
          strFilePath=fp.fileURL.path;
       }
       strFilePath=makePathCompatible(strFilePath);
       var f=new File(strFilePath);
       //var boolFileExists=f.exists();
       //alert(boolFileExists);
       f.create();
       f.open('w');
       f.write(dataSource.serializeToString());
       f.close();
       refreshTree();
     }

  } else{
        alert("Error: no alcatraz component. can't create an annotation.");
  }
}
//*/

function file_local(){
  // noch nicht programmiert
}

function file_annotaDB(){
  alert("At the moment it is not possible to use the annota DB! This feature is not yet programmed.");
  var menu_item=document.getElementById('local');
  menu_item.setAttribute('checked','true');
}

function tree_click(){
    var rdfFile = this.getURIOfSelectedNode();
   if (rdfFile!=''){
     //alert('New identifier: '+ rdfFile);
     this.send_annotation(rdfFile);
   }
}


/***
* Diese Funktion wird gebraucht um im Dialog den Pfad zu digilib zu setzen
*
***/
function setDigilibPath(digilibPathValue){
   digilib_path=digilibPathValue;
}

/***
* Dialog tools momentan kann man nur den Pfad zu digilib setzen
*
***/
function show_dialog(dialog){
	if (dialog=="tool path"){
		window.openDialog("tools_dialog.xul","funny dialog",
		    "chrome",digilib_path,setDigilibPath);
	}
	if (dialog == 'creator') {
		var creatorName = window.prompt('Enter the name of the creator of the annotations:'
			,this.creator);
		if(creatorName != '') {
            this.creator = creatorName;
		}
	}
}


/***
* Gibt den Inhalt eines Files als String zurueck
*
***/
function readFile(fileName){
  var file = new File(fileName);
  var string = '';
  if (file.isFile()){
    file.open();
    string=file.read();
    file.close();
  }
  return string;
}

/**
 * @todo digilib.jsp sollte hier nicht auf die urn schauen, sondern auf den fn parameter!
 */
function getContentOfRdfDescription(id) {
	dataSource = new RDFDataSource('file://'+this.getProfileDirectory()+slash+'annotations.rdf');
	var inMemoryDataSource = new RDFDataSource();
    var node = dataSource.getNode(id);
	var properties = node.getProperties();
	var urn = this.getAttributeOfSelectedNode('url');
    urn = urn.replace(/^file:\/\//,"");
    urn = this.makePathCompatible(urn);
	var inMemoryNode = inMemoryDataSource.getNode(this.BEGIN_OF_URI+':'+urn);
	while(properties.hasMoreElements()) {
	    var property = properties.getNext();
        var target = node.getTarget(property);
		inMemoryNode.addTarget(property,target);
	}
    return inMemoryDataSource.serializeToString();
}

/**
 * @todo check if it is platform independant
 */
function send_annotation(rdfFilePath){
   //digilib_path = 'http://pythia2.unibe.ch:8080/docuserver/digitallibrary';
   strRdfFile = this.getContentOfRdfDescription(rdfFilePath);
   //alert(strRdfFile);
   if (strRdfFile!=''){
     var formid = 'mainform';
     var form = this.createForm(formid, digilib_path+"/digilib.jsp", "post", "_content");
     this.setFormData(form, formid, strRdfFile);
     form.submit();
   }
}

function createForm(formid, action, method, target) {
     var form = document.getElementById(formid);
     if(form != null)
     document.documentElement.removeChild(form);

     var form = document.createElementNS("http://www.w3.org/1999/xhtml", "form");
     form.setAttribute("id", formid);
     form.setAttribute("action", action);
     form.setAttribute("method", method);
     form.setAttribute("target", target);
     document.documentElement.appendChild(form);
     return form;
}

function setFormData(form, formid, rdf) {
     var val1 = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
     val1.setAttribute('type', 'hidden');
     val1.setAttribute('name', 'rdf');
     val1.setAttribute('value', rdf);
     form.appendChild(val1);
}


function getProfileDirectory(){
	// First get the directory service and query interface it to
	// nsIProperties
	var dirService = Components.
		classes['@mozilla.org/file/directory_service;1'].
		getService(Components.interfaces.nsIProperties);

	// Next get the "ProfD" property of type nsIFile from the directory
	// service, FYI this constant is defined in
	// mozilla/xpcom/io/nsAppDirectoryServiceDefs.h

	const NS_APP_USER_PROFILE_50_DIR = "ProfD";
	profileDir = dirService.get(NS_APP_USER_PROFILE_50_DIR,
			Components.interfaces.nsIFile);

	// Now that we have it we can show it's path. See nsIFile for the
	// other things you that can be done with profileDir
	//alert(profileDir.path);
	return profileDir.path;
}

function getProfile(){
	var strProfile=readFile(getProfileDirectory()+slash+"annota.dat");
	if (strProfile==""){
		directory=slash;
		digilib_path="http://hera.unibe.ch:8080/alcatraz";
		creator = 'unknown'
		setProfile();
	} else {
		var params=strProfile.split("\n");
		for (var i=0;i<params.length;i++){
			var key_value=params[i].split("|");
		    if (key_value[0]=='directory'){
    			directory=key_value[1];
			}
		    if (key_value[0]=='tool path'){
    			digilib_path=key_value[1];
			}
			if(key_value[0] == 'creator') {
                creator = key_value[1];
			}
		}
	}
}

/**
 * @todo Menuentry where the user can set the creator name.
 */
function setProfile(){
	var file = new File(getProfileDirectory()+slash+'annota.dat');
	file.create();
	file.open('w');
	file.write('directory|'+directory+'\n'
	    +'tool path|'+digilib_path+'\n'
		+'creator|'+this.creator+'\n');
	file.close();
}

function getAnnotations() {
    var annotations = this.readFile(this.getProfileDirectory()+slash+'annotations.rdf');
	if(annotations=='') {
        this.setAnnotations();
	}
}

function setAnnotations() {
    var file = new File(this.getProfileDirectory()+slash+'annotations.rdf');
	//alert(this.getProfileDirectory()+slash+'annotations.rdf');
	file.create();
	file.open('w');
	file.write('<?xml version="1.0"?>\n'
        +'<RDF:RDF xmlns:ECHO="' + ECHO + '"\n'
        +'    xmlns:ANNOTATION=\"http://www.w3.org/2000/10/annotation-ns#"'
        +'    xmlns:DC=\"http://purl.org/dc/elements/1.0/"'
        +'    xmlns:RDF=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
        +'</RDF:RDF>\n');
    file.close();
}

function traverse(node){
   if (node.hasChildNodes){   
      var arr_nodes=node.childNodes;  
      for (var i=0;i<arr_nodes.length;i++){
	 if (arr_nodes[i].getAttribute("open")){
            //alert(arr_nodes[i].getAttribute("open"));
            if (arr_nodes[i].hasChildNodes && arr_nodes[i].firstChild.hasChildNodes){
               alert(arr_nodes[i].firstChild.firstChild.getAttribute("label"));
            }
         }         
         traverse(arr_nodes[i]);  
      }
   }
}

function traverseTree(){
    var t=document.getElementById("file_tree");
    traverse(t);
}
