include ('chrome://jslib/content/io/dir.js');
include ('chrome://jslib/content/io/file.js');
include ('chrome://jslib/content/io/rdfBase.js');
include ('chrome://jslib/content/io/rdfResource.js');
include ('chrome://jslib/content/io/rdfContainer.js');
include ('chrome://jslib/content/io/rdf.js');
include ('chrome://jslib/content/io/rdfFile.js');
include('chrome://jslib/content/io/fileUtils.js');

var slash='/';
if (navigator.platform=="Win32"){
   slash='\\';
}

var directory=slash;
var digilib_path=slash;

getProfile(); 

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

  // set default direcotry
  var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  directory=makePathCompatible(directory);
  aLocalFile.initWithPath(directory);
  fp.displayDirectory=aLocalFile;

  var res=fp.show();
  if (res==nsIFilePicker.returnOK){
    directory=fp.fileURL.path;
    directory=makePathCompatible(directory);
    setTreeDirectory();
  }
}

function setTreeDirectory(){
    var t=document.getElementById("file_tree");
    t.setAttribute("ref","file://"+directory);
}

function refreshTree(){
   var t=document.getElementById("file_tree");
   t.builder.rebuild(); 
}

function file_save(){
  
  // get Digilib-Parameter form Browser
  // alert(window.content.location.href);

 var documentpath='';
   try{
      documentpath=window.content.getParameter('fn'); 
   }catch (e){
      documentpath='';
   }
   if (documentpath != ''){
     var docPath='urn:echo:'+documentpath;

      var rdfString='<?xml version="1.0"?>' +
                  '<RDF:RDF xmlns:NS1="http://echo.unibe.ch/digilib/rdf#"' +
                  '         xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#"' +
                  '         xmlns:d="http://purl.org/dc/elements/1.0/"' +
                  '         xmlns:a="http://www.w3.org/2000/10/annotation-ns#">' +
                  '         <RDF:Seq RDF:about="urn:echo">' +
                  '         <RDF:li RDF:resource="'+docPath+'"/>' +
                  '         </RDF:Seq>' +   
                  '         <RDF:Description RDF:about="'+docPath+'" NS1:page=0"/>'+
                  '</RDF:RDF>';

     var ds=new RDFDataSource();
     ds.parseFromString(rdfString,"http://echo.unibe.ch/digilib/rdf/digilib.rdf");
     var node=ds.getNode(docPath);
     var arrayParams=window.content.listParameters();
     for (i=0; i< arrayParams.length; i++){
        var value=window.content.getParameter(arrayParams[i]);
        //alert(arrayParams[i]+":"+value);
        node.addTarget("http://echo.unibe.ch/digilib/rdf#"+arrayParams[i],value);
     }
     node.addTarget("http://echo.unibe.ch/digilib/rdf#lv","1");
     //alert(ds.serializeToString());
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
       f.write(ds.serializeToString());
       f.close();
       refreshTree();
     }
  }else{
     alert("Error: no alcatraz component. can't create an annotation.");
  }
}

function file_local(){
  // noch nicht programmiert
}

function file_annotaDB(){
  alert("At the moment it is not possible to use the annota DB! This feature is not yet programmed.");
  var menu_item=document.getElementById('local');
  menu_item.setAttribute('checked','true');
}

function tree_click(){
   var t=document.getElementById("file_tree");    //tree element
   var l=t.view.getItemAtIndex(t.currentIndex);   //aus baum treeitem herausholen mit dem selected index (currentIndex)   
                                                  //l.firstChild ist treeitem
   var d=l.firstChild.firstChild;                 //treecell
   var firstLabel=d.getAttribute("label"); 
   var cols=document.getElementById("cols");
   var col=cols.childNodes;
   var nodes=l.firstChild.childNodes;
   var rdf_file="";
   for (var i=0;i<nodes.length;i++){
      if (col[i].getAttribute("label")=="URL"){
         rdf_file=nodes[i].getAttribute("label");
      }
   }
   if (rdf_file!=""){
     send_annotation(rdf_file);
   }
   return rdf_file;  
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
}


/***
* Gibt den Inhalt eines Files als String zurueck
*
***/
function readFile(str_Filename){
  var f=new File(str_Filename);
  var str="";
  if (f.isFile()){
    f.open();
    str=f.read();
    f.close();
  }
  return str;
} 



function send_annotation(rdf_file){
   rdf_file=rdf_file.replace(/^file:\/\//,"");
   rdf_file=makePathCompatible(rdf_file);
   strRdfFile=readFile(rdf_file);
   if (strRdfFile!=""){
     var formid='mainform';   
     var form = createForm(formid, digilib_path+"/digilib.jsp", "post", "_content");
     //var form = createForm(formid, "http://sophia.unibe.ch:8080/examples/servlet/RequestRDF", "post", "_content");
     //var form = createForm(formid, "http://hera.unibe.ch:8080/examples/servlet/RequestRDF", "post", "_content");
     setFormData(form, formid, strRdfFile);
     form.submit();
   }
}

function createForm(formid, action, method, target)
{
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

function setFormData(form, formid, rdf)
{
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
      setProfile();
   }else{
      var params=strProfile.split("\n");
      for (var i=0;i<params.length;i++){
         var key_value=params[i].split("|");
	 if (key_value[0]=='directory'){
	    directory=key_value[1];
         }
	 if (key_value[0]=='tool path'){
	    digilib_path=key_value[1];
         }
      }
   }
}

function setProfile(){
   var f=new File(getProfileDirectory()+slash+'annota.dat');
   f.create();
   f.open('w');
   f.write('directory|'+directory+'\n'+'tool path|'+digilib_path+'\n');
   f.close();
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
