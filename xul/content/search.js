var key='';

function start_search(){
   var search_string=document.getElementById("search_value").value;
   var search_category=document.getElementById("category").selectedItem.label;
   var target_iframe=parent.document.getElementById('result_frame'); 
   if (search_string!='' || search_category=='none'){       
      var level1=document.getElementById("level1");
      var level2=document.getElementById("level2");
      var level3=document.getElementById("level3");
      target_iframe.setAttribute('src','http://hera.unibe.ch:8080/alcatraz/xul/digilib_search.jsp?key='+key+'&cat='+search_category+'&str='+search_string);
      //target_iframe.setAttribute('src','result.htm'); 	
   }else{
      alert("Fehler: Kein Suchstring definiert!");
   }
}


function changeMenuList(){
  if (document.getElementById("category").selectedItem.label !='none'){
   document.getElementById("search_value").disabled=false;
   document.getElementById("search_value").value=''; 
  }else{ 
    document.getElementById("search_value").disabled=true; 
   document.getElementById("search_value").value='';
  }
}


function changeCollection(sel){
   key=sel.value;
   var levels=sel.label.split(";");
   var level1=document.getElementById("level1"); 
   var level2=document.getElementById("level2"); 
   var level3=document.getElementById("level3"); 
   if (levels.length>0){
     level1.setAttribute('value',levels[0]); 
   }else{
     level1.setAttribute('value',''); 
   }
   if (levels.length>1){
     level2.setAttribute('value','   '+levels[1]);
   } else{
     level2.setAttribute('value','');
   }
   if (levels.length>2){
     level3.setAttribute('value','      '+levels[2]);
   }else{
     level3.setAttribute('value','');
   }
   
}