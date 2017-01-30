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
			s: 0,				//Status
			ovfl: 0,			//Overflow
			udfl: 0,			//Underflow
			pc: 0				//Program counter
		}

		cpu.instructionSet = {
			"ADD": cpu.add,
			"SUB": cpu.sub,
			"MOV": cpu.mov
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
		cpu.log(line);
		
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
	cpu.parseArgs = function( args, ind, exec ) {
	
		var ara = args.split(",");
		if ( ara.length < 2 ) throw ('Syntax error, invalid arg count on line ' + cpu.registers.pc);

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

var source = "MOV r0,#255\n";
source += "MOV r1,#10\n";
source += "ADD r0,r1\n";
source += "SUB #50,r1\n";

var program = new jscpu();
program.init(source);
