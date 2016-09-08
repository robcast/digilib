# Configuring digilib

## digilib-config.xml

The main configuration for digilib is the XML file `digilib-config.xml` in the `WEB-INF` 
directory in the webapp or a Java properties file `digilib.properties` somewhere in the classpath.
(If you really need a different location for the XML file you can define it in the `config-file`
init-parameter to the Servlet.)

In the configuration file you can set lots of paths and options. digilib uses
default values for all configuration settings that meet most requirements
so you have to configure only the settings that you want to change.

You have to adjust the **`basedir-list`** parameter to the directories
where your images are installed. The directory path has to be an absolute 
path following the conventions of your operating system (a relative path 
is taken to be relative to the web application directory).

You need only one directory if you don't want to provide pre-scaled low resolution 
versions of your images. If you have pre-scaled images the directory with the 
high-resolution images must be the first entry in the list.

Documentation on the directory layout and on using pre-scaled images is 
[here](image-directories.html).

A minimal configuration looks like this:

	<!-- Digilib servlet config file -->
	<digilib-config>
	  <!-- List of directories where images are searched.
	       The authoritative directory with the high-resolution images
	       is first in list. -->
	  <parameter name="basedir-list" value="/docuserver/images" />
	</digilib-config>
	
A more customized configuration may look like the following 
(for another commented example see 
[digilib-config.xml.template](https://sourceforge.net/p/digilib/code/ci/default/tree/webapp/src/main/webapp/WEB-INF/digilib-config.xml.template),
for a full list of
configuration options and their default values use the source:
[DigilibConfiguration](https://sourceforge.net/p/digilib/code/ci/default/tree/common/src/main/java/digilib/conf/DigilibConfiguration.java),
[DigilibServletConfiguration](https://sourceforge.net/p/digilib/code/ci/default/tree/servlet/src/main/java/digilib/conf/DigilibServletConfiguration.java),
[DigilibServlet3Configuration](https://sourceforge.net/p/digilib/code/ci/default/tree/servlet3/src/main/java/digilib/conf/DigilibServlet3Configuration.java)
):

	<!-- Digilib servlet config file -->
	<digilib-config>
	  <!--  Image to be sent to indicate general failure. -->
	  <parameter name="error-image" value="/docuserver/images/icons/broken.gif" />
	
	  <!--  Image to be sent to indicate authorization failure. -->
	  <parameter name="denied-image" value="/docuserver/images/icons/alert.red.gif" />
	
	  <!--  Image to be sent to indicate file-not-found. -->
	  <parameter name="notfound-image" value="/docuserver/images/icons/notfound.gif" />
	
	  <!-- List of directories where images are searched.
	       The authoritative directory with the high-resolution images
	       is first in list. -->
	  <parameter name="basedir-list" value="/docuserver/images:/docuserver/scaled/small" />
	
	  <!-- default interpolation quality (0=worst) -->
	  <parameter name="default-quality" value="2"/>
	
	  <!-- is sending whole image files with mo=file allowed? -->
	  <parameter name="sendfile-allowed" value="true" />
	
	  <!-- the a maximum size of any sent image. (0 means no limit) -->
	  <parameter name="max-image-size" value="0" />
	
	  <!-- number of working threads -->
	  <parameter name="worker-threads" value="2" />
	
	  <!-- number of waiting requests in queue -->
	  <parameter name="max-waiting-threads" value="20" />
	
	  <!-- Restrict access to authorized users -->
	  <parameter name="use-authorization" value="false"/>
	
	  <!-- use mapping of "virtual directories" to real directories on the server -->
	  <parameter name="use-mapping" value="true"/>
	
	  <!-- location of XML name mapping file -->
	  <parameter name="mapping-file" value="digilib-map.xml"/>
	
	  <!-- location of logger config file -->
	  <parameter name="log-config-file" value="log4j-config.xml"/>
	</digilib-config>

You can supply your own icons for the "error" and "access denied" 
messages by the servlet. Standard images will be used if these
parameters are not defined.

If you need authorization set `use-authorization` to true and read the 
[documentation on authentication and authorization](auth.html).

You can see a summary of your running digilib configuration at the URL 
[http://localhost:8080/digitallibrary/server/dlConfig.jsp](http://localhost:8080/digitallibrary/server/dlConfig.jsp)

        