function myFunction(x) {
  if (x.matches) { // If media query matches
	var rightSideBar = document.getElementById("rightSideBar");
	var mainSideBar= document.getElementById("mainSideBar");
	var mainBarIcon= document.getElementById("mainBarIcon");
	var rightBarIcon = document.getElementById("rightBarIcon");
	
	$("rightSideBar").removeClass("control-sidebar");
	rightSideBar.setAttribute("class","main-sidebar sidebar-dark-primary elevation-4");
	$("mainSideBar").removeClass("main-sidebar");
	mainSideBar.setAttribute("class","control-sidebar control-sidebar-dark");
	
	$("mainBarIcon").removeClass("fas fa-bars");
	mainBarIcon.setAttribute("class","fas fa-bullhorn");
	$("rightBarIcon").removeClass("fas fa-bullhorn");
	rightBarIcon.setAttribute("class","fas fa-bars");	
	
	if(document.getElementById('rightSideBar').style.display=="none"){document.getElementById('rightSideBar').style.display="block";}	
	
  } else {	
  	var rightSideBar = document.getElementById("rightSideBar");
	var mainSideBar= document.getElementById("mainSideBar");
	var mainBarIcon= document.getElementById("mainBarIcon");
	var rightBarIcon = document.getElementById("rightBarIcon");
	
	$("rightSideBar").removeClass("main-sidebar");
	rightSideBar.setAttribute("class","control-sidebar control-sidebar-dark");	
	$("mainSideBar").removeClass("control-sidebar");
	mainSideBar.setAttribute("class","main-sidebar sidebar-dark-primary elevation-4");
	
	$("mainBarIcon").removeClass("fas fa-bullhorn");
	mainBarIcon.setAttribute("class","fas fa-bars");
	$("rightBarIcon").removeClass("fas fa-bars");
	rightBarIcon.setAttribute("class","fas fa-bullhorn");		
	
	if(document.getElementById('mainSideBar').style.display=="none"){document.getElementById('mainSideBar').style.display="block";}
  }
}

var x = window.matchMedia("(max-width: 700px)")
myFunction(x) // Call listener function at run time
x.addListener(myFunction) // Attach listener function on state changes