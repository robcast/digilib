function open_link()
{
var t=document.getElementById("menu_tree");    //baum in variable t holen
var l=t.view.getItemAtIndex(t.currentIndex);	        //aus baum treeitem herausholen mit dem selected index (currentIndex)
var d=l.firstChild.firstChild.getAttribute("link");       //aus treeitem treecell (mit firstChild.firstChild) und dann dort wert von id herausholen (mit getAttribute)
if (d!=""){
  //alert(d);

     window.content.location.href="http://pythia2.unibe.ch:8080/docuserver/digitallibrary/digilib.jsp?lv=1&fn="+d;
  
}
}
