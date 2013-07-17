package digilib.util;

/*
 * #%L
 * Set for option flags.
 * %%
 * Copyright (C) 2010 - 2013 MPIWG Berlin
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

import java.util.HashSet;
import java.util.StringTokenizer;

/**
 * @author casties
 *
 */
@SuppressWarnings("serial")
public class OptionsSet extends HashSet<String> {

	protected String optionSep = ",";
	
	public OptionsSet() {
		super();
	}

	/** Constructor with String of options.
	 * @param s
	 */
	public OptionsSet(String s) {
		super();
		parseString(s);
	}

	/** Adds all options from String to Set.
	 * @param s
	 */
	public void parseString(String s) {
		if (s != null) {
			StringTokenizer i = new StringTokenizer(s, optionSep);
			while (i.hasMoreTokens()) {
				String opt = i.nextToken();
				this.add(opt);
			}
		}
	}
	
	/**
	 * Set the option opt.
	 * 
	 * @param opt
	 * @return
	 */
	public boolean setOption(String opt) {
	    return this.add(opt);
	}
	
	/**
	 * Return if the option opt is set.
	 * 
	 * @param opt
	 * @return
	 */
	public boolean hasOption(String opt) {
		return this.contains(opt);
	}

	public String toString() {
		StringBuffer b = new StringBuffer();
		for (String s: this) {
			if (b.length() > 0) {
				b.append(optionSep);
			}
			b.append(s);			
		}
		return b.toString();
	}
	
	
	public String getOptionSep() {
		return optionSep;
	}

	public void setOptionSep(String optionSep) {
		this.optionSep = optionSep;
	}

}
