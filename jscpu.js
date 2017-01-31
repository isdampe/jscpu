/**
 * A very simple javascript CPU "emulator", that emulates
 * no specific hardware or assembly language.
 * @package jscpu
 * @version 0.1.0
 */
function jscpu() {

	var cpu = this;

	cpu.inst = [];
	cpu.pEnd = 0;
	cpu.debug = true;

	/**
	 * Reinitialize registers
	 */
	cpu.reset = function() {

		cpu.regSize = 256; //8 Bit, single byte
		cpu.registers = {
			r0: 0,				//Register 0
			r1:  0,				//Register 1
			s: 0,					//Status
			ovfl: 0,			//Overflow
			udfl: 0,			//Underflow
			pc: 0					//Program counter
		}

		cpu.instructionSet = {
			"add": cpu.add,			//Addition
			"sub": cpu.sub,			//Subtraction
			"mov": cpu.mov,			//Move value
			"jmp": cpu.jmp,			//Jump to
			"cmp": cpu.cmp,			//Compare values
			"cgt": cpu.cgt,			//Check if greater than
			"clt": cpu.clt,			//Compare if less than
			"jnz": cpu.jnz,			//Jump if not zero
			"jze": cpu.jze			//Jump if zero
		};

	};

	/**
	 * Loads the assembly code into the CPU emulator
	 * @param {string} asm - The assembly language source code
	 */
	cpu.init = function(asm) {

		//Parse the ASM into "calls"
		cpu.reset();
		
		var rb = asm.split("\n");
		var i=0, max = rb.length;

		if ( rb.length < 1 ) {
			throw ('No assembly source received');
			return false;
		}

		for ( i; i<max; i++ ) {
			let line = rb[i];
			line = line.trim();
			if ( line == "" ) continue; //Skip blank lines
			this.inst.push(line);
		}

		cpu.pEnd = this.inst.length;

		cpu.log('CPU initialized, program count ' + cpu.pEnd);

		cpu.main();
	
	};

	/**
	 * The main CPU loop function
	 * Runs continuously until there is nothing left to do, i.e
	 * cpu.pc is greater than the source length
	 */
	cpu.main = function() {

		var line = "";

		//Continue executing until program count exceeds program length
		while( cpu.registers.pc < cpu.pEnd ) {
			
			line = cpu.inst[cpu.registers.pc];
			cpu.exec(line);

		}

		cpu.log(cpu.registers);

	};

	/**
	 * Parses and executes an ASM function
	 * @param {line} string - The line of the function to execute
	 */
	cpu.exec = function(line) {
	
		var abf = line.split(" ");
		if ( abf.length < 2 ) {
			throw ('Syntax error, line ' + cpu.registers.pc + ', expected at least one space' );
		}

		var inst = abf[0];
		if (! cpu.instructionSet.hasOwnProperty(inst) ) {
			throw ('Syntax error, line ' + cpu.registers.pc + ', unknown function \'' + inst + '\'');
		}

		var args = abf[1].trim();
		if ( args == "" ) throw ('Syntax error, no arguments provided for function \'' + inst + '\' on line ' + cpu.registers.pc);

		//Execute on the virtual cpu
		cpu.log(line);
		cpu.instructionSet[inst](args);
		
		cpu.registers.pc++;

	};

	/**
	 * Adds two unsigned ints together
	 * Triggers the overflow register if result exceeds 8 bits
	 * @example
	 * ADD #1,r0 ; Adds decimal 1 to value of register 0
	 */
	cpu.add = function(arg) {

		var ad = cpu.parseArgs( arg, 0 ); //Add value
		var cv = cpu.parseArgs( arg, 1 ); //Current value
		var dr = cpu.parseArgs( arg, 1, false ); //Destination register

		cpu.log('Adding ' + ad + ' to ' + cv + ' and storing in ' + dr);
		var res = Math.floor( ad + cv );

		//Handle overflows
		if ( res >= cpu.regSize ) {
			res = cpu.regSize -1;
			cpu.setRegisterValue('ovfl',1);
		}

		cpu.setRegisterValue(dr, res);
		

	};

	/**
	 * Changes the value of memory in a given register
	 * @example
	 * MOV r0,#50 ; Move the decimal value 50 into register 0
	 */
	cpu.mov = function(arg) {

		var dr = cpu.parseArgs( arg, 0, false ); //Destination register
		var dv = cpu.parseArgs( arg, 1, true ); //Destination value;

		cpu.setRegisterValue(dr, dv);

	};

	/**
	 * Substracts a value from a register value and stores it in a register
	 * @example
	 * SUB #10,r1 ; Subtracts decimal 10 from the value of register 1, and stores the result in register 1
	 * SUB r0,r1 ; Subtracts the value of register 0 from register 1, and stores the result in register 1
	 */
	cpu.sub = function(arg) {

		var sd = cpu.parseArgs( arg, 0 ); //Subtract value
		var cv = cpu.parseArgs( arg, 1 ); //Current value
		var dr = cpu.parseArgs( arg, 1, false ); //Destination register

		cpu.log('Subtracting ' + sd + ' from ' + cv + ' and storing in ' + dr);

		var res = Math.floor( cv - sd );

		//Handle underflows
		if ( res < 0 ) {
			res = 0;
			cpu.setRegisterValue('udfl',1);
		}

		cpu.setRegisterValue(dr, res);

	};

	cpu.jmp = function(arg) {

		var jd = cpu.parseArgs( arg, 0, true, 1 ); //Get the value of where we want to jump.
		if ( jd < 0 || jd > cpu.pEnd ) throw( 'Syntax error: jmp called to address that is out of bounds: ' + jd );

		//Set our pc register to jd less 1, as the main loop will reincrement it after this call
		cpu.registers.pc = jd -1;
	
	};

	/**
	 * Compares two values to check if they are equal
	 * @param {arg} string - The argument string, i.e r0,r1
	 * @return {void}
	 */
	cpu.cmp = function(arg) {
		
		var fv = cpu.parseArgs( arg, 0 ); //First value for comparison
		var sv = cpu.parseArgs( arg, 1 ); //Second value for comparison

		cpu.log('Comparing ' + fv + ' with ' + sv);

		var r = ( fv === sv ? 1 : 0 );
		cpu.setRegisterValue("s", r); //Set the result in the status register
	
	};

	/**
	 * Jumps to a specified address if status register is not zero
	 * @param {arg} string - The argument string, i.e #1 or r0
	 */
	cpu.jnz = function(arg) {

		var r = cpu.getRegisterValue('s');
		if ( r === 0 ) return;

		cpu.jmp(arg);
	
	};

/**
	 * Jumps to a specified address if status register equals zero
	 * @param {arg} string - The argument string, i.e #1 or r0
	 */
	cpu.jze = function(arg) {

		var r = cpu.getRegisterValue('s');
		if ( r !== 0 ) return;

		cpu.jmp(arg);
	
	};

	/**
	 * Debug logging function
	 * @param {line} string - The string to log
	 */
	cpu.log = function(line) {
		if ( cpu.debug ) console.log(line);
	}

	/**
	 * Returns a requested value from an args string
	 * @param {args} string - The argument string, i.e r0,#10
	 * @param {ind} int - The argument number to receive, 0 or 1
	 * @param {exec} bool - Whether to return the raw argument, or the value implied by the arguments (I.e, r1 or the value of r1)
	 * @return {mixed} 
	 */
	cpu.parseArgs = function( args, ind, exec, len ) {

		if ( typeof len === 'undefined' ) len = 2;
	
		var ara = args.split(",");
		if ( ara.length < len ) throw ('Syntax error, invalid arg count on line ' + cpu.registers.pc);

		var rv = ara[ind];
		var val = false;

		if ( exec === false ) {
			return rv;
		}

		if ( rv.substr(0,1) === "#" ) {
			//Real number.
			val = parseInt(rv.substr(1));
		} else {
			//Assume register.
			val = cpu.getRegisterValue(rv);
		}

		return val;

	};

	/**
	 * Returns a specified register value
	 * @param {rName} string - The register name
	 * @return {mixed} The value of the register
	 */
	cpu.getRegisterValue = function( rName ) {

		cpu.validateRegister(rName);
		return cpu.registers[rName];
	
	};

	/**
	 * Sets the value of a specified register
	 * @param {string} rName - The name of the register
	 * @param {int} val - The integer value to store
	 */
	cpu.setRegisterValue = function( rName, val ) {
	
		cpu.validateRegister(rName);
		cpu.registers[rName] = val;

	};

	/**
	 * Checks the syntax of the register name to ensure it's real
	 * @param {string} rName - The name of the register to check
	 * @return {bool} True or false
	 */
	cpu.validateRegister = function(rName) {
		if (! cpu.registers.hasOwnProperty(rName) ) throw ('Syntax error, unknown register \'' + rName + '\' called on line ' + cpu.registers.pc);
	};

}

var source = "mov r0,#0\n"; //Set register 0 to #0
source += "mov r1,#0\n"; //Set register 1 to #0

//Address #1, incremental counter for r0
source += "add #1,r0\n"; //Add #1 to register 0
source += "cmp #10,r0\n"; //Compare #10 with register 0
source += "jze #2\n"; //Jump to address 1 if register s equals zero (i.e, failed comparison)

//Incremental counter for r1
source += "add #1,r1\n"; //Add #1 to r1
source += "mov r0,#0\n"; //Set register 0 to 0
source += "cmp #5,r1\n"; //Compare #5 with register 1
source += "jze #2\n"; //Jump to address 2 if register 1 equals zero



var program = new jscpu();
program.init(source);
