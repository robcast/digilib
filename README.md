digilib - The Digital Image Library
===================================

A versatile image viewing environment for the internet.

## What is digilib?

* `digilib` is a web based client/server technology for images. The image
  content is processed on-the-fly by a Java Servlet on the server side so that
  only the visible portion of the image is sent to the web browser on the client
  side.
* `digilib` supports a wide range of image formats and viewing options on
  the server side while only requiring an internet browser with Javascript and a
  low bandwidth internet connection on the client side.
* `digilib` enables very detailed work on an image as required by
  scholars with elaborate viewing features like an option to show images on the
  screen in their original size.
* `digilib` facilitates cooperation of scholars over the internet and
  novel uses of source material by image annotations and stable references that
  can be embedded in URLs.
* `digilib` facilitates federation of image servers through a standards compliant
  [IIIF](http://iiif.io) image API.
* `digilib` is Open Source Software under the Lesser General Public License,
  jointly developed by the
  [Max-Planck-Institute for the History of Science](http://www.mpiwg-berlin.mpg.de),
  the [Bibliotheca Hertziana](http://www.biblhertz.it), 
  the [University of Bern](http://philoscience.unibe.ch) and others.

## Where can I get digilib?

`digilib` documentation can be found on the 
[digilib documentation pages](https://robcast.github.io/digilib/) on GitHub
or on [SourceForge](https://sourceforge.net/projects/digilib/)

* [Source code](https://github.com/robcast/digilib)
* [Issue tracker](https://github.com/robcast/digilib/issues)
* Daily built [WAR files](https://it-dev.mpiwg-berlin.mpg.de/downloads/digilib/daily-build/)
* Daily built [Javadoc](https://it-dev.mpiwg-berlin.mpg.de/downloads/digilib/daily-build/javadoc/)
* [Maven repository](http://it-dev.mpiwg-berlin.mpg.de/maven-repo/)

## How do I run digilib?

Requirements:
* [git](https://git-scm.com/)
* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
* [Maven](https://maven.apache.org/)

Build:
1. Clone the digilib repository

   `git clone https://github.com/robcast/digilib.git`

2. Change to the repository

   `cd digilib`
   
3. build and run the webapp in the embedded Jetty runtime for development
 
   `mvn jetty:run --projects webapp`
   
   and watch digilib at http://localhost:8080/digilib.html

or follow the production build instructions in the on https://robcast.github.io/digilib/
