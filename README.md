![digilib-logo](https://robcast.github.io/digilib/images/digilib-logo-big.png)

digilib - The Digital Image Library
[![Build status](https://travis-ci.org/robcast/digilib.svg?branch=master)](http://travis-ci.org/robcast/digilib)
[![Join chat](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/digilib-talk/community)
===================================

digilib is a flexible image server and image viewing environment for the internet:

* scaling image server that supports big images and deep zoom image clients
* works with any image format supported by Java: TIFF, JPEG, PNG,...
* [IIIF API](http://iiif.io) compatible
* multi-platform Java server for easy deployment

Check out all the details in the [documentation](https://robcast.github.io/digilib/).

## How to run digilib (using Docker)

Requirements: 
* [Docker](https://www.docker.com/)

```
docker run --rm -p 8080:8080 robcast/digilib
```
Then open https://localhost:8080/digilib/digilib.html in your browser.

Please see the [documentation on using the digilib Docker image](https://robcast.github.io/digilib/digilib-docker.html).

## How to build and run digilib (using Java)

Requirements:
* [git](https://git-scm.com/)
* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) version 8 or later
* [Maven](https://maven.apache.org/) version 3 or later

```
git clone https://github.com/robcast/digilib.git
cd digilib
mvn jetty:run-exploded --projects webapp
```
Then open http://localhost:8080/digilib/digilib.html in your browser.

Please see the full [build and install documentation](https://robcast.github.io/digilib/build-maven.html).

## digilib resources

* [Source code](https://github.com/robcast/digilib)
* [Issue tracker](https://github.com/robcast/digilib/issues)
* [Docker images](https://hub.docker.com/r/robcast/digilib)
* [Javadoc](https://robcast.github.io/digilib-repo/apidocs/)
* [Maven repository](https://github.com/robcast/digilib-repo/tree/gh-pages/maven-repo/digilib/) (`https://robcast.github.io/digilib-repo/maven-repo/`)

Full documentation can be found on the 
[digilib documentation pages](https://robcast.github.io/digilib/).

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

