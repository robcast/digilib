![digilib](images/digilib-logo-big.png)

## What is digilib?

* **digilib** is a web based client/server technology for images. The image
  content is processed on-the-fly by a Java Servlet on the server side so that
  only the visible portion of the image is sent to the web browser on the client
  side.
* **digilib** supports a wide range of image formats and viewing options on
  the server side while only requiring an internet browser with Javascript and a
  low bandwidth internet connection on the client side.
* **digilib** enables very detailed work on an image as required by
  scholars with elaborate viewing features like an option to show images on the
  screen in their original size.
* **digilib** facilitates cooperation of scholars over the internet and
  novel uses of source material by image annotations and stable references that
  can be embedded in URLs.
* **digilib** facilitates federation of image servers through a standards compliant
  [IIIF](http://iiif.io) Image API.
* **digilib** is Open Source Software under the Lesser General Public License,
  jointly developed by the
  [Max Planck Institute for the History of Science](http://www.mpiwg-berlin.mpg.de),
  the [Bibliotheca Hertziana](http://www.biblhertz.it), 
  the [University of Bern](http://philoscience.unibe.ch) and others.

## digilib resources

**digilib** source code, binaries and documentation can be found on the 
[digilib project pages](https://github.com/robcast/digilib)
on [GitHub](https://github.com).

* [Source code](https://github.com/robcast/digilib)
* [Issue tracker](https://github.com/robcast/digilib/issues)
* [Docker images](https://hub.docker.com/r/robcast/digilib)
* [Javadoc](https://robcast.github.io/digilib-repo/apidocs/)
* [Maven repository](https://github.com/robcast/digilib-repo/tree/gh-pages/maven-repo/digilib/)
    ```
    <repository>
      <id>digilib-github</id>
      <url>https://robcast.github.io/digilib-repo/maven-repo</url>
    </repository>
    ```

## First steps

### Using Docker

Requirements: 

* [Docker](https://www.docker.com/)

```
docker run --rm -p 8080:8080 robcast/digilib
```
Then open https://localhost:8080/digilib/digilib.html in your browser.

Please see the [documentation on using the digilib Docker image](digilib-docker.html).

### Using Java

Requirements:

* [git](https://git-scm.com/)
* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) version 8 or later
* [Maven](https://maven.apache.org/) version 3 or later

```
git clone https://github.com/robcast/digilib.git
cd digilib
mvn jetty:run-exploded --projects frontend-jquery
```
Then open http://localhost:8080/digilib/digilib.html in your browser.

Please see the full [build and install documentation](build-maven.html).
