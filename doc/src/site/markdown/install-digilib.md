# Installing digilib

To run digilib you need:

* [Java](http://www.java.com/) (1.6 or higher)
* a Servlet Container like [Tomcat](http://tomcat.apache.org/) (version 7 or 
higher) or [Jetty](http://www.eclipse.org/jetty/) (version 8 or higher)
* the digilib web application as a WAR file or application directory

## Run the Servlet Container

Install and run the Servlet Container of your choice: 
[Tomcat](http://tomcat.apache.org/tomcat-7.0-doc/setup.html) or 
[Jetty](http://wiki.eclipse.org/Jetty/Howto/Run_Jetty).

When it runs you should be able to access the start page on 
<http://localhost:8080/>

## Install a digilib WAR file

1. Download a digilib WAR file of a recent digilib release from the
SourceForge [Download page](https://sourceforge.net/projects/digilib/files/)
or the latest digilib build from the 
[daily build page](https://it-dev.mpiwg-berlin.mpg.de/downloads/digilib/daily-build/).
2. Rename the WAR file to `digilib.war`.
3. Deploy the WAR file, i.e. drop it into the `webapps` directory of your 
Servlet Container.
4. Restart your Servlet Container (this may not be necessary).
5. Access your digilib instance at <http://localhost:8080/digilib/digilib.html>.

You will now be able to see the sample images provided with the digilib 
installation.

If you want to use digilib to show your own images you have to change the
configuration file [digilib-config.xml](digilib-config.html) **inside** the
web application. This is hard to do with a WAR file so its better to
deploy digilib as a web application directory.

## Install digilib as a web application directory

Unpack the WAR file into a directory called `digilib` using 
an unzip tool or the `jar -xf` Java command. 

Alternatively you can look into the `webapps` directory of your Servlet 
Container (when its not running) to see if it created an unpacked web 
application directory called `digilib`.

Alternatively you can build your own version of digilib as documented
[here](build-maven.html).

Then:

1. Make sure that your Servlet Container is not running and remove any
`digilib.war` files from the `webapps` directory.
2. Copy your `digilib` directory into the `webapps` directory of the
Servlet Container.
3. Edit the `digilib-config.xml` file in the `WEB-INF` subdirectory of the
`digilib` directory and adjust the `basedir-list` parameter to point to
the directory with your image files [according to the 
documentation](digilib-config.html). If there is no file `digilib-config.xml`
you can either create a new file or rename the sample file 
`digilib-config.xml.template` to `digilib-config.xml` and edit it.
4. Start your Servlet Container.
5. Access your digilib instance at <http://localhost:8080/digilib/digilib.html>

You can now view your own images in digilib by providing the directory and file 
name as the `fn` parameter to `digilib.html`, e.g. if your file is called 
`flower.jpg` and it is in a subdirectory of the base directory called 
`digilib-test` you can now access the URL

<http://localhost:8080/digilib/digilib.html?fn=digilib-test/flower>

Read more about the layout of image files and directories 
[here](image-directories.html).
