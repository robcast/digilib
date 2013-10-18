# Digilib Plugins #

The basic client-side Javascript functions to control the Scaler image are provided by a jQuery plugin in the file 'jquery.digilib.js' (in the "jquery" subdirectory of the webapp). The Digilib jQuery plugin comes with a number of its own (sub-)plugins which provide additional functionality, making extensive use of the jQuery javascript library.

All Digilib plugin code must be executed after jQuery and the main Digilib module (jquery.digilib.js).

## Cookie plugin ##

Stores the settings of your current Digilib preferences and view settings in a cookie.

## Geometry plugin ##

Required if you use the client side digilib functions in jquery.digilib.js. The plugin provides basic geometric functions which help calculating screen positions.

## Arrows plugin ##

Adds divs containing navigation arrows around the scaled image.

## Auth plugin ##

Handles authentication.

## Bird's eye plugin ##

Shows a small bird's eye view window with the highlighted current zoom area, useful when looking at zoomed images.

## Dialogs plugin ##

Provides dialogs to set the image calibration (for rendering the object on the image in its original size) and the scaling mode (screen size, predefined image size, or pixel of the original file).

## Range plugin ##

Provides HTML5 range controls for setting brightness, contrast and color values of the scaled image.

## Marks plugin ##

Allows the user to set visual marks on top of the scaled image, defining and referencing points of interest. The marks are numbered and always point to the defined location even when the image is zoomed, rotated or mirrored. The positions of the marks are part of the address. The marks are reproduced when the URL is opened in another browser or computer.

## Regions plugin ##

Allows the user to draw visual regions over the scaled image, defining and referencing areas of interest. The regions are numbered and always point to the defined location even when the image is zoomed, rotated or mirrored. The positions of the regions are part of the address. User-defined regions are reproduced when the URL is opened in another browser or computer.

Regions can also be stored in the HTML code of the page. The code for each region may contain a link to an external resource. When the user clicks on a region, he is transferred to the external resource.

The regions plugin provides an additional set of buttons for defining and deleting regions. Regions can be queried and highlighted by entering coordinates or text.

## Annotator plugin ##

Allows the user to add visual annotations on top of the scaled image, defining and referencing areas or points of interest. The annotations are loaded from an annotation server; new annotations can be inserted and edited. Annotations always point to the defined location even when the image is zoomed, rotated or mirrored.

## How to write your own plugin ##

Start with the stub file `jquery.digilib.pluginstub.js` in the "jquery" subdirectory of your digilib webapp directory.

