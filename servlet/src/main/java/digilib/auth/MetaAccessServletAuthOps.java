package digilib.auth;

/*
 * #%L
 * Authentication class implementation using access information from 
 * file metadata.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2013 MPIWG Berlin
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
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import digilib.conf.DigilibServletRequest;
import digilib.io.DocuDirent;
import digilib.io.FileOpException;
import digilib.meta.MetadataMap;
import digilib.util.HashTree;
import digilib.util.XMLListLoader;

/**
 * Implementation of AuthOps using "access" information from file metadata and
 * roles mapped to IP-number ranges defined in an XML config file.
 * 
 * The configuration file is read by an XMLListLoader into HashTree objects for
 * IP numbers.
 */
public class MetaAccessServletAuthOps extends ServletAuthOpsImpl {

    private File configFile;
    private HashTree authIPs;
    private Map<String, List<String>> rolesMap;

    /**
     * Set configuration file.
     * 
     * @param confFile
     *            XML config file.
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    public void setConfig(File confFile) throws AuthOpException {
        configFile = confFile;
        init();
    }

    /**
     * Initialize.
     * 
     * Read configuration files and setup authorization arrays.
     * 
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    public void init() throws AuthOpException {
        logger.debug("IpRoleServletAuthops.init (" + configFile + ")");
        Map<String, String> ipList = null;
        Map<String, String> roleList = null;
        try {
            // load authIPs
            XMLListLoader ipLoader = new XMLListLoader("digilib-addresses", "address", "ip", "role");
            ipList = ipLoader.loadUri(configFile.toURI());
            // load role mappings
            XMLListLoader roleLoader = new XMLListLoader("digilib-access", "access", "type", "role");
            roleList = roleLoader.loadUri(configFile.toURI());
        } catch (Exception e) {
            throw new AuthOpException("ERROR loading authorization config file: " + e);
        }
        if ((ipList == null)||(roleList == null)) {
            throw new AuthOpException("ERROR unable to load authorization config file!");
        }
        // setup ip tree
        authIPs = new HashTree(ipList, ".", ",");
        // convert role list to map, splitting roles by ","
        rolesMap = new HashMap<String,List<String>>(roleList.size());
        for (String k : roleList.keySet()) {
            String rs = roleList.get(k);
            String[] ra = rs.split(",");
            rolesMap.put(k, Arrays.asList(ra));
        }
    }

    /**
     * Return authorization roles needed for request.
     * 
     * Returns the list of authorization roles that are needed to access the
     * specified path. No list means the path is free.
     * 
     * The location information of the request is also considered.
     * 
     * @param request
     *            ServletRequest with address information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return List of Strings with role names.
     */
    @Override
    public List<String> rolesForPath(DigilibServletRequest dlRequest) throws AuthOpException {
        HttpServletRequest request = dlRequest.getServletRequest();
        DocuDirent imgs;
        try {
            imgs = (DocuDirent) dlRequest.getJobDescription().getImageSet();
        } catch (FileOpException e) {
            throw new AuthOpException("No file for auth check!");
        }
        /*
         * check if the requests address provides a role
         */
        List<String> provided = authIPs.match(request.getRemoteAddr());
        if ((provided != null) && (provided.contains("ALL"))) {
            // ALL switches off checking;
            logger.debug("rolesForPath (" + imgs.getName() + ") by [" + request.getRemoteAddr() + "]: (ip-all)");
            return null;
        }
        /*
         * get access restrictions from metadata
         */
        String access = null;
        try {
            imgs.checkMeta();
            MetadataMap meta = imgs.getMeta().getFileMeta();
            access = meta.get("access");
        } catch (Exception e) {
            logger.error("Error getting access meta for file!");
        }
        if (access == null) {
            // no access restriction - allow
            logger.debug("rolesForPath (" + imgs.getName() + ") by [" + request.getRemoteAddr() + "]: (none)");
            return null;
        }
        // check provided against required roles
        List<String> required = rolesMap.get(access);
        // do any provided roles match?
        if ((provided != null) && (required != null)) {
            for (String prov : provided) {
                if (required.contains(prov)) {
                    // satisfied
                    logger.debug("rolesForPath (" + imgs.getName() + ") by [" + request.getRemoteAddr() + "]: (provided)");
                    return null;
                }
            }
        }
        logger.debug("rolesForPath (" + imgs.getName() + ") by [" + request.getRemoteAddr() + "]: "+required);
        return required;
    }

}
