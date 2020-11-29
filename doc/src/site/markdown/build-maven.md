# Building digilib with Maven

The best way to get the latest and greatest digilib is using the [git](https://git-scm.com/) version control and the [Maven](http://maven.apache.org/) build tool. 
Git will download the digilib code and Maven will compile, and install the latest digilib version and all required libraries.

## What you need

* [git](https://git-scm.com/)
* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) (8 or higher)
* [Maven](http://maven.apache.org/)

## Quick developer build and run

1. Clone the digilib repository into a directory `digilib`
   
        git clone https://github.com/robcast/digilib.git
   
2. Change to the directory
   
        cd digilib
   
3. build and run the webapp in the embedded Jetty runtime for development
   
        mvn jetty:run-exploded --projects frontend-jquery
   
   and watch your digilib at http://localhost:8080/digilib.html

## Developer build

If you are developing with digilib it is helpful to check out the source
code separately so you can keep it around, modify it or change the configuration
before you deploy.

To check out the latest source code into the directory `digilib` run
	
    git clone https://github.com/robcast/digilib.git
    
and change into the repository directory

    cd digilib

If you want to update your copy of digilib to the latest version at some time in the future 
just run

	git pull

The digilib configuration files are in the sub-directory `frontend-jquery/src/main/webapp/WEB-INF/` (see below).

To build the resulting source code run

	mvn package

This will create a web application directory `digilib-frontend-jquery-2.9-SNAPSHOT`
and a WAR file `digilib-frontend-jquery-2.9-SNAPSHOT.war` (or similar) in
the subdirectory `frontend-jquery/target/` .


## Deploying the web application by hand

To deploy digilib just copy the web application directory or the WAR file into the `webapp`
directory of the Servlet container.

Since the URL of your digilib server starts with the name of the web application
and the name of the web application is derived from the name of the web
application directory or the WAR file **please rename the web application directory or WAR file 
to `digilib` before you start**

Then you should see digilib running at the URL 
http://localhost:8080/digilib/digilib.html

If you use the unmodified default configuration you should see the digilib logo
and other sample images from the `sample-images` directory of the web application.

For more detailed documentation see the [deployment instructions](install-digilib.html).

## Configuring digilib

To change the configuration of digilib just create and edit the file `digilib-config.xml`
in the web application WEB-INF directory (`frontend-jquery/src/main/webapp/WEB-INF/digilib-config.xml`).
You can copy and rename the sample file `digilib-config.xml.template` to get some default options to start with.
Please check the [documentation of the configuration options](digilib-config.html).

You can see a summary of your running digilib configuration at the URL 
http://localhost:8080/digilib/server/dlConfig.jsp

## Configuring frontends

Since version 2.9 the digilib HTML and Javascript client has been split into multiple Maven modules.

The default client used in this documentation is in the module `frontend-jquery` and its configuration files are
in the directory `frontend-jquery/src/main/webapp/WEB-INF/` and the web application is built in the directory 
`frontend-jquery/target/`.

If you don't need the digilib HTML and Javascript client (maybe you are only using the IIIF API) then
you can use the basic webapplication in the `webapp` module. Its configuration files are
in the directory `webapp/src/main/webapp/WEB-INF/` and the web application is built in the directory 
`webapp/target/`.

There are older client versions in the modules `frontend-greyskin` and `frontend-oldskin` that are not built by default.

You can customize the digilib frontend with your own HTML and Javascript files by creating your own
Maven module that uses the existing `digilib-frontend-jquery` client and overlays it with additional files.
You can find an example in the `frontend-jquery-example` module or by copying the template repository

https://github.com/robcast/digilib-frontend-template 


## Additional Maven build options

Some build options have to be activated as Maven profiles with the `-P` command line option
when building digilib. For example, to build digilib with the Manifester servlet ("iiif-presentation") 
use:

    mvn -Piiif-presentation package

You can add multiple profiles at the same time if necessary.


### servlet3

Digilib uses the Asynchronous Servlet API (3.0) by default. You will need Java version 8 or later 
and Tomcat version 7 or Jetty version 8 or later to use it.

`-Pservlet3` builds digillib with the Asynchronous Servlet API (3.0). This is the default profile, it will be used
if you do not specify any profile.

The build process uses the file `webapp/src/main/webapp/WEB-INF/web.xml` as `web.xml` file. 

### servlet2

`-Pservlet2` builds a servlet with the the old non-Asynchronous Servlet API (2.3).

This creates a WAR file in the `webapp-srv2` module.
The build process uses the file `webapp-srv2/src/main/webapp/WEB-INF/web.xml` as `web.xml` file.

### iiif-presentation

`-Piiif-presentation` builds digilib with the "Manifester" servlet for IIIF Presentation API support 
(see [digilib IIIF support documentation](iiif-api.html)). This is a default profile.

### text

`-Ptext` builds digilib with the "Texter" servlet to download plain text or XML files 
(see [the source](https://github.com/robcast/digilib/tree/master/text)). You have
to add `-Pservlet3` or `-Pservlet2` as well.

### pdf

`-Ppdf` builds digilib with the "PDFGenerator" servlet to generate and download PDF files from images. 
(see [the documentation](pdf-generator.html)).

## create-sprites

`-Pcreate-sprites` re-creates the image sprite file (`webapp/src/main/webapp/jquery/img/dl-buttons-full-32-sprite.png`) 
from the separate icon image files. This option only needs to be used if you are a developer and you want to 
change the icon images.

## running tests

`-DskipTests=false` enables some functional tests. The tests are run as part of the normal build process.
You can also run just the tests with `mvn -DskipTests=false test`.

