# Java VM memory settings for digilib

(Robert Casties, September 2013)

The Java virtual machine (Java-VM) only uses a fixed amount of memory for
its operations. When an operation needs more memory than available it aborts
with an error ("out of memory error").

digilib can need a lot of memory depending on the size and type of images.
Since digilib runs as a servlet under Tomcat its in the same VM as the Tomcat
server.

The amount of memory Tomcat (version 5.0) uses is configured by creating a
`setenv.sh` (or `setenbv.bat`) script with a line

    CATALINA_OPTS="-Xmx512m"

in Tomcat's `bin` directory (giving 512MB RAM in this case).

You can check the amount of memory your digilib instance has available on the
bottom of the web page `/server/dlConfig.jsp` in your digilib instance (e.g. 
<http://localhost:8080/digilib/server/dlConfig.jsp>

# Installing JAI ImageIO

(Robert Casties, September 2013)

In principle you should be able to install the 
[Java Advanced Imaging](http://java.sun.com/javase/technologies/desktop/media/jai/) JAI-ImageIO
JAR file `jai_imageio.jar` (and native
library files if available) in the `/WEB-INF/lib/` directory of the
digilib web application as part of the default installation.

You can see if the Jai-ImageIO plugin is active by checking for the 
availability of the TIFF image format under "Supported image types" on the 
[`/server/dlConfig.jsp`](http://localhost:8080/digilib/server/dlConfig.jsp)
status page.

Sometimes there are problems with leaking memory. Newer versions of Tomcat refuse to load
the libraries (see JREMemoryLeakPreventionListener) and I found that in some 
cases digilib stopped reading TIFF files
after a period of running. In these cases it helped to install the JAI files in 
Tomcats `lib/` directory or globally in the local Java JDK
installation (i.e. in the Java's 'jre/lib/ext/' directory on linux).

If you really need to have the imageio-plugins JAR inside the web app, please consider 
using Harald Kuhrs [IIOProviderContextListener](https://github.com/haraldk/TwelveMonkeys#deploying-the-plugins-in-a-web-app).
 

# Codec availability and Performance

(Ubbo Veentjer, Oct 2015)

The number of image formats, which digilib may read or write, but also the performance of operating on this image formats depends on the ImageIO readers and writers available on the classpath.

Working with larger images in JPEG format we experienced a big performance difference using different implementations of the JPEG readers/writers. OpenJDK-7 for example brings rather slow JPEG codecs, OpenJDK-8 operates much quicker on JPEG images, relying on libjpeg-turbo for this file format. Also the official Oracle-JDKs may include faster native codecs. 

Some drop-in replacements for the native codecs are:

* https://github.com/geosolutions-it/imageio-ext
* https://github.com/haraldk/TwelveMonkeys

if these jar files are availabe on the classpath, the codecs may be used by digilib. To add them the jar files could e.g. be placed in the lib directory of tomcat or addded as a dependency to the digilib maven project.

The actual codec implementation used is logged by digilib in debug mode, e.g.

    1564059 [http-apr-9092-exec-4] DEBUG digilib.image.DocuImage  - ImageIO: this reader: class com.twelvemonkeys.imageio.plugins.jpeg.JPEGImageReader

(Robert Casties, Oct 2015)

You can now use the TwelveMonkeys codecs instead of the default JAI-ImageIO by just [building digilib](build-maven.html) with the Maven-Parameter `imageio=12m`:

    mvn -Dimageio=12m package

# Codec performance

(Ubbo Veentjer, Oct 2015)

In our tests comparing the performance of OpenJDK7, OpenJDK8, imageio-ext and TwelveMonkeys codecs we experienced the following numbers for decoding, encoding and scaling a 4968px*5968px JPEG file with a color profile to 50% size: 

    24801 ms - OpenJDK7
    11507 ms - OpenJDK7 with com.twelvemonkeys.imageio.plugins.jpeg.JPEGImageReader
    4216 ms - OpenJDK7 with imageio-ext using libjpeg-turbo
    3635 ms - OpenJDK8 

This numbers may depend on the actual implementation used, the processing power of the CPU and many other factors, to this is just meant to be a rough hint.

For using imageio-ext, the native library needs to be 
available with the `LD_LIBRARY_PATH` environment variable (compare: https://github.com/geosolutions-it/imageio-ext/wiki/TurboJPEG-plugin), also the .jar archives need to be on the classpath.

For using the TwelveMonkey Codecs we added the following jars to the tomcat lib directory, which were retrieved by maven (dependency on imageio-jpeg-3.1.2):

* common-image-3.1.2.jar
* common-lang-3.1.2.jar
* imageio-jpeg-3.1.2.jar
* common-io-3.1.2.jar
* imageio-core-3.1.2.jar
* imageio-metadata-3.1.2.jar


# Available image formats

(Ubbo Veentjer, Oct 2015)

Digilib logs on startup which image formats are supported, e.g: 

    9763 [localhost-startStop-1] INFO digilib.conf.DigilibConfiguration  - DocuImage supported image formats: raw, jpeg, tif, WBMP, pcx, PNM, JPG, wbmp, JPEG, PNG, jpeg 2000, tiff, BMP, JPEG2000, RAW, jpeg2000, GIF, TIF, TIFF, bmp, jpg, PCX, pnm, png, gif,

by adding e.g. TwelveMonkeys or image-io ext codecs, more codecs could become available.


