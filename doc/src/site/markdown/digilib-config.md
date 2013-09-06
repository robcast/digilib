# Configuring digilib

## digilib-config.xml

The main configuration for digilib is `digilib-config.xml` in the `WEB-INF` 
directory in the webapp. 
(If you really need a different location you can define it in the `config-file`
init-parameter to the Servlet.)

In the XML-based configuration file you can set several paths and options. 

You have to adjust the **`basedir-list`** parameter to the directories
where your images are installed. The directory path has to be an absolute 
path following the conventions of your operating system (a relative path 
is taken to be relative to the web application directory).

You need only one directory if you don't want to provide pre-scaled low resolution 
versions of your images. If you have pre-scaled images the directory with the 
high-resolution images must be the first entry in the list.

Documentation on the directory layout and on using pre-scaled images is 
[here](image-directories.md).

A minimal configuration looks like this:

	<!-- Digilib servlet config file -->
	<digilib-config>
	  <!-- List of directories where images are searched.
	       The authoritative directory with the high-resolution images
	       is first in list. -->
	  <parameter name="basedir-list" value="/docuserver/images" />
	</digilib-config>
	
A more customized configuration may look like this (for a full list of
configuration options use the source: 
[1](http://hg.berlios.de/repos/digilib/file/default/common/src/main/java/digilib/conf/DigilibConfiguration.java) 
[2](http://hg.berlios.de/repos/digilib/file/default/servlet/src/main/java/digilib/conf/DigilibServletConfiguration.java)
[3](http://hg.berlios.de/repos/digilib/file/default/servlet3/src/main/java/digilib/conf/DigilibServlet3Configuration.java)
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
	
	  <!-- mimimum amount of scaling done with antialiasing -->
	  <parameter name="subsample-minimum" value="2"/>
	
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
	
	  <!-- Restrict access to authorized users.
	       User authentication and roles are provided by the servlet container 
	       (see tomcat-users.xml).
	       Authorization for resources (directories) is evaluated by the servlet 
	       (see auth-file). -->
	  <parameter name="use-authorization" value="false"/>
	
	  <!-- Location of XML file with authorization requirements. -->
	  <parameter name="auth-file" value="digilib-auth.xml"/>
	
	  <!-- Part of URL to indicate authenticated access to Tomcat. -->
	  <parameter name="auth-url-path" value="authenticated/"/>
	
	  <!-- use mapping of "virtual directories" to real directories on the server -->
	  <parameter name="use-mapping" value="false"/>
	
	  <!-- location of XML mapping file -->
	  <parameter name="mapping-file" value="digilib-map.xml"/>
	
	  <!-- location of logger config file -->
	  <parameter name="log-config-file" value="log4j-config.xml"/>
	</digilib-config>

You can supply your own icons for the "error" and "access denied" 
messages by the servlet. Standard images will be used if these
parameters are not defined.

You can specify the Java toolkit implementation with the `docuimage-class`
parameter. The `ImageLoaderDocuImage` usually gives best performance
and works with JDK 1.4 and up.

You can see a summary of your running digilib configuration at the URL 
[http://localhost:8080/digitallibrary/server/dlConfig.jsp](http://localhost:8080/digitallibrary/server/dlConfig.jsp)


## digilib-auth.xml

The digilib access authorization is defined in the file defined by the `auth-file`
parameter (default: `digilib-auth.xml` in `WEB-INF` ).

The file has two parts `diglib-paths` and `diglib-addresses`. It looks like this:

	<auth-config>
	
	  <digilib-paths>
	    <!-- 
	      A user must supply one of the roles under "role"
	      to access the directory "name".
	      Roles under "role" must be separated by comma only (no spaces).  
	    -->
	    <path name="histast/eastwood-collection" role="eastwood-coll" />
	    <path name="ptolemaios_geo" role="ptolemaios-geo" />
	  </digilib-paths>
	
	  <digilib-addresses>
	    <!-- 
	      A computer with an ip address that matches "ip"
	      is automatically granted all roles under "role".
	      The ip address is matched from the left (in full quads).
	      Roles under "role" must be separated by comma only (no spaces). 
	    -->
	    <address ip="127" role="local" />
	    <address ip="130.92.68" role="eastwood-coll,ptolemaios-geo" />
	    <address ip="130.92.151" role="ALL" />
	  </digilib-addresses>
	
	</auth-config>

`diglib-paths` defines restricted directories and the roles needed
for access. The roles are defined with the users in `tomcat-users.xml`
(see above). All subdirectories of the given directories have the same
restrictions. All directories not listed here (and not subdirectories of listed
directories) are freely accessible.

`diglib-addresses` defines hosts or networks of computers that are
automatically authenticated without username and password. Hosts can be assigned
roles. The special keyword `ALL` authorizes for everything. If the
role assigned to the computer is not sufficient to access a resource the user
will be asked for username and password.
        