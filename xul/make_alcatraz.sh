#!/bin/sh
jar -cf alcatraz.jar content skin locale
jar -cf alcatraz.xpi alcatraz.jar install.js
echo "alcatraz created ... trying to copy to pythia2 (password for user 'alcatraz' required)"
scp alcatraz.xpi install.html alcatraz@pythia2.unibe.ch:/data01/docuserver/www/digitallibrary/xul
