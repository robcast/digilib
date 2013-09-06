# Java VM settings for digilib

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

In principle you should be able to install the 
[Java Advanced Imaging](http://java.sun.com/javase/technologies/desktop/media/jai/) JAI-ImageIO
JAR file `jai_imageio.jar` (and native
library files if available) in the `/WEB-INF/lib/` directory of the
digilib web application as part of the default installation.

You can see if the Jai-ImageIO plugin is active by checking for the 
availability of the TIFF image format under "Supported image types" on the 
[`/server/dlConfig.jsp`](http://localhost:8080/digilib/server/dlConfig.jsp)
status page.

Sometimes there are memory issues. Newer versions of Tomcat refuse to load
the libraries and I found that in some cases digilib stopped reading TIFF files
after a period of running. In these cases it helped to install the JAI files in 
Tomcats `lib/` directory or globally in the local Java JDK
installation (i.e. in the Java's 'jre/lib/ext/' directory on linux).

# Sample setup

The current digilib setup at the MPIWG (as of December 2010):

* One frontend server running the lightweight web-multiplexer [pound](http://www.apsis.ch/pound/)
    on port 80 that distributes requests to three servers runnning digilib
* the three servers run digilib under [Jetty](http://www.eclipse.org/jetty/) on port 8080 without Apache
   * one server is the frontend server (Linux 32bit, Dual 2.4GHz Xeon, 2GB RAM)
   * the other server is a separate, newer machine (Linux 64bit, Dual 1.8GHz Opteron, 2GB RAM)
   * the third server is a separate, newer machine (Linux 32bit, Dual 2.8GHz Xeon, 4GB RAM)
* the digilib instances (digilib 2.0b1 as of 12.12.2011) run on Jetty 8.0.4 on Java
   1.6.0_26 with 1GB of Java VM memory for digilib (-Xmx1024m) with JAI (1.1.3) and JAI-ImageIO (1.1)
   installed in `Jetty/lib/ext`
* both digilib servers access all image files over NFS (over GBit Ethernet) from a central file server 
   (Solaris 10, Sun Fire 240, multiple RAIDs on Fibrechannel)