//@@@@@@@@@@@@@@@@
function MOZ_SidebarInstaller  //<c><a>public<d>Mozilla Sidebar installer class
(
_title,   //<p>string<d>Sidebar title
_url,   //<p>string<d>Sidebar URL
_customize  //<p>string<d>Sidebar customization
){
const
INTERFACES    = Components.interfaces,
nsIRDFRemoteDataSource = INTERFACES.nsIRDFRemoteDataSource,                 
nsIRDFService   = INTERFACES.nsIRDFService,    RDF_CID   = "@mozilla.org/rdf/rdf-service;1",
nsIRDFContainer   = INTERFACES.nsIRDFContainer,   CONTAINER_CID = "@mozilla.org/rdf/container;1",
nsIProperties   = INTERFACES.nsIProperties,    DIR_SERV_CID = "@mozilla.org/file/directory_service;1",
nsIIOService   = INTERFACES.nsIIOService,    IO_SERVICE_CID = '@mozilla.org/network/io-service;1',
NC_NAMESPACE   = 'http://home.netscape.com/NC-rdf#',
SIDEBAR_PANEL_URN  = NC_NAMESPACE + 'panel-list',
SIDEBAR_CUR_URN   = 'urn:sidebar:current-panel-list',
SIDEBAR_3RD_URN   = 'urn:sidebar:3rdparty-panel:',
PANELS_RDF_FILE   = "UPnls";  //directory services property to find panels.rdf
const
MSG_PANEL_IN_LIST  = ' panel is already in Sidebar list\nSelect it in the Tabs > Customize Sidebar... menu',
MSG_PANEL_REFRESHED = ' panel successfully refreshed',
MSG_PANEL_ADDED   = ' panel has been successfully added to your sidebar',
MSG_PANEL_SOURCE  = 'Sidebar datasource is busted',
MSG_NO_RDF_FILE   = 'panels.rdf file does not exist in your profile\nInstallation aborted';



//================
this.MOZ_SidebarInstaller = function  //<m>void<a>private<d>class constructor
(
title,   //<p>string<d>Sidebar panel title
url,   //<p>string<d>Sidebar panel URL
customize  //<p>string<d>Sidebar panel customization preferences
){
this.className = 'MOZ_SidebarInstaller';
this.title  = title;
this.url  = url;
this.customize = customize;
this.setIn();
}//</m>MOZ_SidebarInstaller



//================
this.setIn = function  //<m>void<a>private<d>Instance i12n
(){
this.rdf    = Components.classes[RDF_CID].getService(nsIRDFService);
this.container   = Components.classes[CONTAINER_CID].createInstance(nsIRDFContainer);
this.source    = this.rdf.GetDataSource(this.getSource());
this.currentResource = this.rdf.GetResource(SIDEBAR_CUR_URN);
this.installResource = this.rdf.GetResource(SIDEBAR_3RD_URN + this.url);
}//</m>setIn



//================
this.setUp = function  //<m>void<a>public<d>Installation execution method
(){
if(!this.source) return;
this.container.Init(this.source, this.getPanelList());
if (this.container.IndexOf(this.installResource) == -1) {
  this.setPanelResource(this.installResource);
  this.setPanelRefresh();
  this.setOutput(this.title + MSG_PANEL_ADDED);
} else {
  this.setPanelRefresh();
  this.setOutput(this.title + MSG_PANEL_REFRESHED);
}
}//</m>setUp



//================
this.setPanelResource = function //<m>void<a>public<d>Create a resource for the new panel and add it to the sidebar panel list
(
resource  //<p>Object<d>Sidebar panel RDF resource
){
this.setRDFTriple(resource, 'title', this.title, true);
this.setRDFTriple(resource, 'content', this.url, true);
if(this.customize) this.setRDFTriple(resource, 'customize', this.customize, true);
this.container.AppendElement(resource);
}//</m>setPanelResource



//================
this.setPanelRefresh = function //<m>void<a>public<d>Refresh Sidebar panels
(){
this.setRDFTriple(this.currentResource, 'refresh', 'true', true);
this.setRDFTriple(this.currentResource, 'refresh', 'false', false);
this.source.QueryInterface(nsIRDFRemoteDataSource).Flush();
}//</m>setPanelRefresh<d>&
/*
We pass a "refresh" event to all sidebars observers watching for this assertion (in sidebarOverlay.js)
*/



//================
this.getPanelList = function  //<m>Object<a>public<d>Get Sidebar panel resource
(){
var
panelList = this.source.GetTarget(this.currentResource, this.rdf.GetResource(SIDEBAR_PANEL_URN), true);
if(panelList) panelList.QueryInterface(INTERFACES.nsIRDFResource);
else this.setOutput(MSG_PANEL_SOURCE);
return panelList;
}//</m>getPanelList



//================
this.getSource = function  //<m>string<a>private<d>Get the Sidebar panels.rdf datasource URL
(){
try{
 var
 dirService = Components.classes[DIR_SERV_CID].getService();
 dirService = dirService.QueryInterface(nsIProperties);
 var
 sidebarFile = dirService.get(PANELS_RDF_FILE, INTERFACES.nsIFile);
 if(!sidebarFile.exists()) throw MSG_NO_RDF_FILE;
 var
 ioService = Components.classes[IO_SERVICE_CID].getService(nsIIOService),
 fileURL = ioService.newFileURI(sidebarFile);
 fileURL = fileURL.QueryInterface(INTERFACES.nsIFileURL);
 return fileURL.spec;
 }
catch(e){
 return this.setOutput(e);
 }
}//</m>getSource<d>&
/*
panels.rdf file is located in the user profile directory
If the file does not exist already, it is copied from /bin/defaults/profile/panels.rdf
*/



//================
this.setRDFTriple = function  //<m>void<a>private<d>Setup an assertion in the RDF datasource member
(
subject,  //<p>string<d>Assertion subject
property,  //<p>string<d>Assertion property
object,   //<p>string<d>Assertion object
asserting  //<p>boolean<d>Set or remove Assertion
){
this.source[asserting ? 'Assert' : 'Unassert'](subject, this.rdf.GetResource(NC_NAMESPACE + property), this.rdf.GetLiteral(object), true);
}//</m>setRDFTriple



//================
this.setOutput = function  //<m>boolean<a>private<d>Dump message to output console
(
output  //<p>string<d>Message to output
){
var
/*string*/out = //'[' + this.className + ']\n' +
 output + '\n';
window.alert(out);   //dump(output);
return null;
}//</m>setOutput<d>&
/*
Use either console or window alert output
*/



this.MOZ_SidebarInstaller(_title, _url, _customize);
}//</c>MOZ_SidebarInstaller



