# Installing digilib

To run digilib you need:

* [Java JDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html) (7 or higher)
* a Servlet Container like [Tomcat](http://tomcat.apache.org/) (version 7 or 
later) or [Jetty](http://www.eclipse.org/jetty/) (version 8 or later)
* the digilib web application as a WAR file or application directory

## Start the Servlet Container

Install and run the Servlet Container of your choice: 
[Tomcat](http://tomcat.apache.org/tomcat-7.0-doc/setup.html) or 
[Jetty](http://wiki.eclipse.org/Jetty/Howto/Run_Jetty).

When the Servlet Container runs you should be able to access the start page on 
<http://localhost:8080/>

## Deploy via WAR file or web application directory?

A web application can be deployed either as a WAR file or a web application directory (aka "exploded web application"). 

The advantage of the WAR file is that it is easy to handle because it is just one file.

The disadvantage of the WAR file is that it is not easy to change the [digilib configuration](digilib-config.html)
file or any of the HTML or Javascript files because they are hidden in the WAR file.

It is possible to unpack a WAR file into a web application directory to be able to change its contents (see below).

## Where to get a WAR file or web application directory?

The preferred way is to [build your own](build-maven.html) WAR file or web application directory using the digilib sources. 
In this way you can change the configuration files in the source directory and create a new WAR file
or web application directory any time you need. 
Also you get the chance to always use the latest digilib version by updating the source code. 

You can also download a digilib WAR file with a default configuration from the
[SourceForge download page](https://sourceforge.net/projects/digilib/files/)
or the latest digilib build from the 
[daily build page](https://it-dev.mpiwg-berlin.mpg.de/downloads/digilib/daily-build/). 
The default configuration will only show a set of sample images. If you want to show your own images
you will need to change the [digilib configuration](digilib-config.html) to point to your image directories. 


## Install a digilib WAR file

1. Get a digilib WAR file.
2. Rename the WAR file to `digilib.war`.
3. Deploy the WAR file by copying it into the `webapps` directory of your 
Servlet Container.
4. Restart your Servlet Container (this may not be necessary).
5. Access your digilib instance at <http://localhost:8080/digilib/digilib.html>.

You will now be able to see the sample images provided with the digilib 
installation in the default configuration yor your own images 
if you have updated the [configuration](digilib-config.html).

In digilib you can view images by providing the directory and file 
name as the `fn` parameter to `digilib.html`, e.g. if your file is called 
`ruler.jpg` and it is in the base directory you can now access the URL

<http://localhost:8080/digilib/digilib.html?fn=ruler>

Read more about the layout of image files and directories 
[here](image-directories.html).


## Install digilib as a web application directory

1. Get a digilib web application directory.
2. Rename the WAR file to `digilib.war`.
3. Deploy the WAR file by copying it into the `webapps` directory of your 
Servlet Container.
4. Restart your Servlet Container (this may not be necessary).
5. Access your digilib instance at <http://localhost:8080/digilib/digilib.html>

You will now be able to see the sample images provided with the digilib 
installation in the default configuration yor your own images 
if you have updated the [configuration](digilib-config.html).

In digilib you can view images by providing the directory and file 
name as the `fn` parameter to `digilib.html`, e.g. if your file is called 
`ruler.jpg` and it is in the base directory you can now access the URL

<http://localhost:8080/digilib/digilib.html?fn=ruler>

Read more about the layout of image files and directories 
[here](image-directories.html).


## Unpack a WAR file into a web application directory

You can unpack the WAR file into a directory called `digilib` using 
an unzip tool or the `jar -xf` Java command. 

Alternatively you can look into the `webapps` directory of your Servlet 
Container (when its not running) to see if it created an unpacked web 
application directory called `digilib`. Then:

1. Make sure that your Servlet Container is not running and remove any
`digilib.war` files from the `webapps` directory.
2. Copy your `digilib` directory into the `webapps` directory of the
Servlet Container.
