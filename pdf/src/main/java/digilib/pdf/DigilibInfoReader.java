package digilib.pdf;

/*
 * #%L
 * DigilibInfoReader
 * 
 * A class for reading the information from info.xml files used in digilib image directories.
 * 
 * %%
 * Copyright (C) 2009 MPIWG Berlin
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
 * Authors: Christopher Mielack,
 *          Robert Casties (robcast@berlios.de)
 */

/** DigilibInfoReader 
 * A class for reading the information from info.xml files used in digilib image directories.
 *
 */

import java.io.File;
import java.util.List;

import org.jdom.Document;
import org.jdom.Element;
import org.jdom.input.SAXBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DigilibInfoReader {

    /** gengeral logger for this class */
    protected static final Logger logger = LoggerFactory.getLogger("digilib.servlet");

    private String filename = null;
    // private static String base_element = "info";

    public DigilibInfoReader(String fn) {
        filename = fn;
    }

    /**
     * Returns the attribute defined by 'attr' as a String.
     * 
     * @param attr
     * @return
     */
    @SuppressWarnings("unchecked") // Element.getChildren() returns naked List
    public String getAsString(String attr) {
        try {
            SAXBuilder builder = new SAXBuilder();
            Document doc = builder.build(new File(filename));
            Element root = doc.getRootElement();
            List<Element> mainElements = root.getChildren();
            // logger.debug("XML mainElements:"+mainElements.toString());

            for (int i = 0; i < mainElements.size(); i++) {
                Element elem = mainElements.get(i);
                if (elem.getName() == attr) {
                    // logger.debug(attr+" == "+(String)elem.getTextTrim());
                    return (String) elem.getTextTrim();
                }
            }

        } catch (Exception e) {
            logger.error(e.getMessage());
        }
        return null;
    }

    /**
     * Find out if the info.xml exists
     * 
     * @return
     */
    public boolean hasInfo() {
        try {
            SAXBuilder builder = new SAXBuilder();
            builder.build(new File(filename));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

}
