/*
Copyright (C) 2003 WTWG, Uni Bern
 
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 
Author: Christian Luginbuehl, 24.01.2004 , Version Alcatraz 0.5
*/


include(jslib_dirutils);
include(jslib_file);

var du = new DirUtils();
var f  = new File('alcatraz.pref');

f.initPath(du.getPrefsDir());
f.append('alcatraz.pref');

function getSetting(name) {

  if (f.exists()) {
  
    f.open();
    var content = f.read();
    f.close();

    var lines = content.split(/\n/);
    
    for (i = 0; i <lines.length; i++) {
      var line = lines[i].split('=');
      if (line[0] == name) {
        return line[1];
      }
    }
  }

  return null;
}


function saveSetting(name, value) {

  var content = "";
 
  if (f.exists()) {
    f.open();
    content = f.read();
    f.close();
    f.remove();
  }

  f.create();
  f.open('w');
  f.write(name + '=' + value + '\n');

  var lines = content.split(/\n/);
    
  for (i = 0; i < lines.length; i++) {
    var line = lines[i].split('=');
    if (line[0] != name && line[0] != '') {
      f.write(line[0] + '=' + line[1] + '\n');
    }
  }
  f.close();
}
