window.onload=function(){
	var isIE = navigator.userAgent.search("Trident") > -1;

    if (isIE) {
		let element = document.getElementById("bodyContent");
		while (element.firstChild) {
		  element.removeChild(element.firstChild);
		}
}
}
