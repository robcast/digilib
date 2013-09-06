# Building digilib with Maven

The easiest way to get the latest and greatest digilib is the [Maven](http://maven.apache.org/) build tool. 
It will download, compile, and install the latest digilib version and all required libraries.

## What you need

* [Java](http://www.java.com/) (1.5 or higher)
* [Maven](http://maven.apache.org/)
* [Mercurial](http://mercurial.selenic.com/)
* A Servlet container like [Tomcat](http://tomcat.apache.org/) 
or [Jetty](http://www.eclipse.org/jetty/) to run the web application.

## Quick build

The fastest way to build the digilib web application is to download the digilib 
project file [pom.xml](http://hg.berlios.de/repos/digilib/raw-file/tip/pom.xml)
(download and save it) and run
	
	mvn scm:bootstrap -N

in the same directory as the `pom.xml` file.

This will create a web application directory `digilib-webapp-2.2-SNAPSHOT` 
and a WAR file `digilib-webapp-2.2-SNAPSHOT-srv3.war` (or similar) 
in the subdirectory `target/checkout/webapp/target/`

Digilib uses the Asynchronous Servlet API (3.0) by default. You will need Java version 6 
and Tomcat version 7 or Jetty version 8 or later to use it.
If you want to use the old non-Asynchronous Servlet API (2.3) add `-Pservlet2`
to the Maven command line above.

## Developer build

If you are developing with digilib it is helpful to check out the source
code separately so you can keep it around, modify it or change the configuration
before you deploy.

To check out the latest source code into the directory `digilib` run
	
	hg clone http://hg.berlios.de/repos/digilib

The digilib configuration files are now in `digilib/webapp/src/main/webapp/WEB-INF/`

If you want to update your copy of digilib to the latest version at some time in the future 
just run

	hg pull
	hg up
	
in the `digilib` directory.

To build the resulting source code, change into the `digilib`
directory you checked out above and run

	mvn package

This will create a web application directory `digilib-webapp-2.2-SNAPSHOT`
and a WAR file `digilib-webapp-2.2-SNAPSHOT-srv3.war` (or similar) in
the subdirectory `webapp/target/` .

Digilib uses the Asynchronous Servlet API (3.0) by default. You will need Java version 6 
and Tomcat version 7 or Jetty version 8 or later to use it.
If you want to use the old non-Asynchronous Servlet API (2.3) add `-Pservlet2`
to the Maven command line above.

## Deploying the web application by hand

To deploy digilib just copy the web application directory or the WAR file into the `webapp`
directory of the Servlet container.

Since the URL of your digilib server starts with the name of the web application
and the name of the web application is derived from the name of the web
application directory or the WAR file **please rename the web application directory or WAR file 
to `digitallibrary` before you start**

Then you should see your digilib running at the URL 
[http://localhost:8080/digitallibrary/jquery/digilib.html](http://localhost:8080/digitallibrary/jquery/digilib.html)

If you use the unmodified default configuration you should see the digilib logo
and other sample images from the `sample-images` directory of the web application.

## Configuring digilib

To change the configuration of digilib just edit the file `digilib-config.xml`
in the web application directory (`digitallibrary/WEB-INF/digilib-config.xml`).
Documentation of the configuration options is [here](digilib-config.html).

You can see a summary of your running digilib configuration at the URL 
[http://localhost:8080/digitallibrary/server/dlConfig.jsp](http://localhost:8080/digitallibrary/server/dlConfig.jsp)

