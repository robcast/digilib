/****************************************************************************
 * - sample module for digilib                                              *
 *                                                                          *
 *                       christian luginbuehl (luginbuehl@student.unibe.ch) *
 ****************************************************************************/

/**
 * generates a pdf-file using a perl-script called makepdf
 *
 * ATTENTION: the script and this function are only in alpha stadium
 */
function makePDF() {
	var pages = prompt("Enter the pages you like to make a PDF of:", att[1]);
	if (pages != null && pages != "") {
		top.location = "http://penelope.unibe.ch/cgi-bin/cgiwrap/luginbul/makepdf.cgi?dir=" + att[0] + "&pages=" + pages;
	}
}
