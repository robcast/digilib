function open_link()
{
var t=document.getElementById("menu_tree");    //baum in variable t holen
var l=t.view.getItemAtIndex(t.currentIndex);	        //aus baum treeitem herausholen mit dem selected index (currentIndex)
var d=l.firstChild.firstChild.getAttribute("link");       //aus treeitem treecell (mit firstChild.firstChild) und dann dort wert von id herausholen (mit getAttribute)
if (d!=""){
  //alert(d);
  var isHera=d.search(/pythia2\.unibe\.ch/);
  if (isHera!=-1){
     window.content.location.href=d;
  }else{
     // window.content.location.href="http://hera.unibe.ch:8080/alcatraz/xul/"+d;
     window.content.location.href="http://pythia2.unibe.ch:8080/docuserver/digitallibrary/"+d;
  }
}
}
