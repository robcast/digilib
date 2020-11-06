package digilib.util;

/*
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2016 - 2017 digilib Community
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
 * Author: Robert Casties (robcast@users.sourceforge.net)
 */

import java.util.EnumSet;
import java.util.StringTokenizer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibOption;

/**
 * @author casties
 *
 */
public class OptionsSet {

	/** content EnumSet */
	private EnumSet<DigilibOption> options;
	
    /** logger */
    protected static final Logger logger = LoggerFactory.getLogger(OptionsSet.class);

	/** String separating options in a String. */
	protected String optionSep = ",";
	
	public OptionsSet() {
		options = EnumSet.noneOf(DigilibOption.class);
	}

	/** Constructor with String of options.
	 * @param s the options string
	 */
	public OptionsSet(String s) {
		options = EnumSet.noneOf(DigilibOption.class);
		parseString(s);
	}

	/** Adds all options from String to Set.
	 * @param s the options string
	 */
	public void parseString(String s) {
		if (s != null) {
			StringTokenizer i = new StringTokenizer(s, optionSep);
			while (i.hasMoreTokens()) {
				String opt = i.nextToken();
				try {
					DigilibOption dlOpt = DigilibOption.valueOf(opt);
					options.add(dlOpt);
				} catch (IllegalArgumentException e) {
					logger.warn("Ignored unknown digilib option: {}", opt); 
				}
			}
		}
	}
	
	/**
	 * Set the option opt.
	 * 
	 * @param opt the DigilibOption
	 * @return if changed
	 */
	public boolean setOption(DigilibOption opt) {
	    return options.add(opt);
	}
	
	/**
	 * Return if the option opt is set.
	 * 
	 * @param opt the DigilibOption
	 * @return if option is set
	 */
	public boolean hasOption(DigilibOption opt) {
		return options.contains(opt);
	}

	/* (non-Javadoc)
	 * @see java.util.AbstractCollection#toString()
	 */
	public String toString() {
		StringBuffer b = new StringBuffer();
		for (DigilibOption s: options) {
			if (b.length() > 0) {
				b.append(optionSep);
			}
			b.append(s);			
		}
		return b.toString();
	}
	
	
	/**
	 * @return the options
	 */
	public EnumSet<DigilibOption> getOptions() {
		return options;
	}

	/**
	 * @param options the options to set
	 */
	public void setOptions(EnumSet<DigilibOption> options) {
		this.options = options;
	}

	/**
	 * @return the option separator
	 */
	public String getOptionSep() {
		return optionSep;
	}

	/**
	 * @param optionSep the option separator
	 */
	public void setOptionSep(String optionSep) {
		this.optionSep = optionSep;
	}

}
