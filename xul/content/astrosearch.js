var key='';

function start_search(){ 
   var target_iframe=document.getElementById('astro_resultframe');
   var boolIsManuscript=document.getElementById("manuscript").selected==true;
   var strDocType="image";
   if (boolIsManuscript){
      strDocType="manuscript";
   }
   var strLibrary=document.getElementById("bibliothek").label;
   var strCentury=document.getElementById("century").label;
   var strAuthor=document.getElementById('autorenkontext').label;  
   var strImageType=document.getElementById('bildtyp').label;

   //target_iframe.setAttribute('src','astro_search.jsp?key='+key+'&cat='+search_category+'&str='+search_string);
   //target_iframe.setAttribute('src','result.htm'); 	
   target_iframe.setAttribute('src','http://hera.unibe.ch:8080/alcatraz/xul/astro_search.jsp?doctype='+strDocType+'&lib='+strLibrary+'&aut='+strAuthor+'&cent='+strCentury+'&type='+strImageType);  
}


function changeRadioGroup(sel){
   key=sel.id; 
   if (key=="image"){
     document.getElementById("bildtyp").disabled=false;  
     document.getElementById("lblbildtyp").disabled=false;
     document.getElementById("bildtyp").label="all";
   }else{ 
     document.getElementById("bildtyp").disabled=true;
     document.getElementById("lblbildtyp").disabled=true;
     document.getElementById("bildtyp").label=""; 
   }
}
