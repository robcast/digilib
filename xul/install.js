/*

Copyright (C) 2003 WTWG, Uni Bern
 
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 
Author: Christian Luginbuehl, 22.05.2003 , Version Alcatraz 0.5

*/

var authorName     = "ubern";


var appName        = "ALCATRAZ";
var appVersion     = "0.5.0";
var appChromeName  = "alcatraz";
var appFile        = "alcatraz.jar";

var jarAppPath     = "content/";
var jarSkinPath    = "skin/";
var jarLocalePath  = "locale/en-US/";

var userChrome     = getFolder("Profile", "chrome");

var successMessage = "The ALCATRAZ package has been successfully installed.\n\nRestart your browser to continue ...";
var errorMessage   = "Installation failed! Well, I have no idea what to do now ... sorry :-(";


initInstall(appName, authorName + appChromeName, appVersion); 

addFile(appName, appVersion, appFile, userChrome, '', true);

registerChrome(Install.CONTENT | Install.PROFILE_CHROME, getFolder(userChrome, appFile), jarAppPath);
registerChrome(Install.SKIN    | Install.PROFILE_CHROME, getFolder(userChrome, appFile), jarSkinPath);
registerChrome(Install.LOCALE  | Install.PROFILE_CHROME, getFolder(userChrome, appFile), jarLocalePath);

/**
 *  pretty simple error handling
 */
var code = getLastError();

if (code == SUCCESS) {
  code = performInstall();

  if (code == SUCCESS ||code == REBOOT_NEEDED) {
    alert(successMessage);
  } else {
    alert(errorMessage);
    cancelInstall(code)
  }
} else {
  cancelInstall(code);
}
