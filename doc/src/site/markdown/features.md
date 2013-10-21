# digilib features

* **client-server architecture**: all the "heavy lifting" is done on the 
  server, the client only displays the image.
  
* **low bandwidth**: you can work with very high resolution images even on
  low bandwidth connections because only the visible part of the image is 
  transferred.
  
* **image manipulation**: images can be zoomed, rotated, mirrored, their
  contrast and brightness or color balance can be changed on the fly without
  changing the original image.
  
* **referenceable views**: every view, including all image manipulations can
  be saved as a URL and put in an email or electronic document and recreated 
  at any time in any browser.
  
* **client-side annotations**: you can put points or rectangular marks on
  any image as annotations that can be saved and recreated as a URL.
  
* **server-side annotations**: you can also put points or rectangular marks
  on an image with some annotation text that is shared through an annotation
  server.
  
* **multiple image formats**: you can use many image formats on the server
  so you don't have to create a different image format for online display (TIFF, 
  JPG, PNG, GIF, JPEG2000, and more depending on Java ImageIO support).
  
* **plugins**: there are several Digilib plugins written in Javascript to add functionality to the client side, making use of jQuery features. See the [plugins](plugins.html) documentation.

* **digilib API**: modifiy the settings, write Javascript functions or provide your own Digilib plugins and event handlers.