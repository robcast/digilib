package digilib.auth;

/*
 * #%L
 * XMLAuthOps -- Authentication class implementation using XML files
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2001 - 2013 Robert Casties (robcast@mail.berlios.de)
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 */

import java.io.File;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import digilib.servlet.DigilibRequest;
import digilib.util.HashTree;
import digilib.util.XMLListLoader;

/** Implementation of AuthOps using XML files.
 *
 * The configuration file is read by an XMLListLoader into HashTree objects for 
 * authentication paths and IP numbers.
 */
public class XMLAuthOps extends AuthOpsImpl {

	private File configFile;
	private HashTree authPaths;
	private HashTree authIPs;

	/** Constructor taking an XML config file.
	 *
	 * @param u utils object
	 * @param confFile Configuration file.
	 * @throws AuthOpException Exception thrown on error.
	 */
	public XMLAuthOps(File confFile) throws AuthOpException {
		configFile = confFile;
		init();
	}

	/** Set configuration file.
	 *
	 * @param confFile XML config file.
	 * @throws AuthOpException Exception thrown on error.
	 */
	public void setConfig(File confFile) throws AuthOpException {
		configFile = confFile;
		init();
	}

	/** Initialize.
	 *
	 * Read configuration files and setup authentication arrays.
	 *
	 * @throws AuthOpException Exception thrown on error.
	 */
	public void init() throws AuthOpException {
		logger.debug("xmlauthops.init (" + configFile + ")");
		Map<String, String> pathList = null;
		Map<String, String> ipList = null;
		try {
			// load authPaths
			XMLListLoader pathLoader =
				new XMLListLoader("digilib-paths", "path", "name", "role");
			pathList = pathLoader.loadURL(configFile.toURL().toString());
			// load authIPs
			XMLListLoader ipLoader =
				new XMLListLoader("digilib-addresses", "address", "ip", "role");
			ipList = ipLoader.loadURL(configFile.toURL().toString());
		} catch (Exception e) {
			throw new AuthOpException(
				"ERROR loading authorization config file: " + e);
		}
		if ((pathList == null) || (ipList == null)) {
			throw new AuthOpException("ERROR unable to load authorization config file!");
		}
		// setup path tree
		authPaths = new HashTree(pathList, "/", ",");
		// setup ip tree
		authIPs = new HashTree(ipList, ".", ",");
	}

	/** Return authorization roles needed for request.
	 *
	 * Returns the list of authorization roles that are needed to access the
	 * specified path. No list means the path is free.
	 *
	 * The location information of the request is also considered.
	 *
	 * @param filepath filepath to be accessed.
	 * @param request ServletRequest with address information.
	 * @throws AuthOpException Exception thrown on error.
	 * @return List of Strings with role names.
	 */
	public List<String> rolesForPath(String filepath, HttpServletRequest request)
		throws digilib.auth.AuthOpException {
		logger.debug("rolesForPath ("
				+ filepath
				+ ") by ["
				+ request.getRemoteAddr()
				+ "]");

		// check if the requests address provides a role
		List<String> provided = authIPs.match(request.getRemoteAddr());
		if ((provided != null) && (provided.contains("ALL"))) {
			// ALL switches off checking;
			return null;
		}
		// which roles are required?
		List<String> required = authPaths.match(filepath);
		// do any provided roles match?
		if ((provided != null) && (required != null)) {
			for (int i = 0; i < provided.size(); i++) {
				if (required.contains(provided.get(i))) {
					// satisfied
					return null;
				}
			}
		}
		return required;
	}

	/**
	 * @see digilib.auth.AuthOps#rolesForPath(digilib.servlet.DigilibRequest)
	 */
	public List<String> rolesForPath(DigilibRequest request) throws AuthOpException {
		logger.debug("rolesForPath ("
				+ request.getFilePath()
				+ ") by ["
				+ request.getServletRequest().getRemoteAddr()
				+ "]");

		// check if the requests address provides a role
		List<String> provided =
			authIPs.match(request.getServletRequest().getRemoteAddr());
		if ((provided != null) && (provided.contains("ALL"))) {
			// ALL switches off checking;
			return null;
		}
		// which roles are required?
		List<String> required = authPaths.match(request.getFilePath());
		// do any provided roles match?
		if ((provided != null) && (required != null)) {
			for (int i = 0; i < provided.size(); i++) {
				if (required.contains(provided.get(i))) {
					// satisfied
					return null;
				}
			}
		}
		return required;
	}

}
