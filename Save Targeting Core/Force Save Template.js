// Stop if not properly selected
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];

// Call AoE for targeting
let wanted = "Line 10" // Change for whatever AoE is required OR set to "Single Target" to bypass AoE call
if (wanted !== "Single Target") { 
	wanted = wanted.split(" ") 
	game.lancer.canvas.WeaponRangeTemplate.fromRange({
		type: wanted[0],
		val: wanted[1],
	}).placeTemplate()
		.then(t => {
			if (t) game.lancer.targetsFromTemplate(t.id);
		}
	);
};

const saveConfig = {
	title: "Save :: HULL",
	path: "system.___", // Replace blank area here with one of: hull / agi / sys / eng
	total: token.actor.system.save, // Automatically populates the save target with the using character's save target
};

let damage = "1d6" // Change as needed
const passConfig = {
	title: "Effect :: Pass",
	description: "Pass Effect"
};

const failConfig = {
	title: "Effect :: Fail",
	description: "Fail Effect"
};		

// For a full list of damage config constructor parameters, see the LANCERVTT source page
const dmgConfigPass = {
	title: "Pass Damage",
	damage: [{type: "Kinetic", val:damage.toString()}]
};

const dmgConfigFail = {
	title: "Fail Damage",
	damage: [{type: "Kinetic", val:damage.toString()}],
};

// Wait for confirmation that targets are selected as desired via this Dialog
await Dialog.wait({
    title:"Confirm Targets",
    content:"Place AoE templates if requires, or select Single Target // Ensure selected targets are correct // Esc to cancel",
    buttons:{
		yes:{
			label:"Confirm",
			callback:async()=> {
				const targets = Array.from(game.user.targets);
				let targetIds = [];
				for await(i of targets){
					targetIds.push(i.document._id)
				};

				await game.macros.getName("Make Save").execute({
					tokenIds:targetIds,
					originatorId:token.document._id,
					saveConfig:saveConfig,
					passConfig: passConfig,
					failConfig: failConfig,
					passEffect: [[],dmgConfigPass], // If dmgConfigs aren't required in the macro you're making, remove them from these lines
					failEffect: [[],dmgConfigFail]
				});
			}
		}
	},
	close:async()=>{
		// Clean up template from canvas
		canvas.templates.placeables.reverse()[0].document.delete()
	}
}, {top:100});