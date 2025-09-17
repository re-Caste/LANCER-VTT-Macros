// Stop if not properly selected
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];

// Token Distance function for use on burst AoE as it scales with token size (lifted from LancerQoL's Engaged automation)
// Everyone say "Thank you, CSMcFarland"
function tokenDistance(t1, t2) {
    const spaces1 = t1.getOccupiedSpaces();
    const spaces2 = t2.getOccupiedSpaces();
    const rays = spaces1.flatMap(s => spaces2.map(t => ({ ray: new Ray(s, t) })));
    return (Math.min(...game.canvas.grid.measureDistances(rays, { gridSpaces: true })));
};

// Call AoE for targeting
let wanted = "Line 10".split(); // Change for whatever AoE is required
game.lancer.canvas.WeaponRangeTemplate.fromRange({ // Calls AoE template and sets targets from it, as in the built-in targeting macros
	type: wanted[0],
	val: wanted[1],
}).placeTemplate()
	.then(t => {
		if (t) game.lancer.targetsFromTemplate(t.id);
	}
);

const saveConfig = {
	title: "Save :: HULL", // Match "HULL" to whichever HASE you're using
	path: "system.hull", // Replace "hull" here with one of: hull / agi / sys / eng as needed
	total: token.actor.system.save, // Automatically populates the save target with the using character's save target
};

let damage = "1d6" // Change as needed
const passCard = {
	title: "Effect :: Pass",
	description: "Pass Effect" // Fill with extraneous effects that the save does on a pass (e.g. knockback)
};

const failCard = {
	title: "Effect :: Fail",
	description: "Fail Effect" // Fill with extraneous effects that the save does on a fail (e.g. knockback)
};		

// Fill damage configs as required, some functional tags have been left here
// Damage types: ["Kinetic", "Energy", "Explosive", "Burn", "Variable", "Heat"]
const passDamage = {
	title: "Pass Damage",
	damage: [{type: "Kinetic", val:damage.toString()}],
	ap:false,
	half_damage:true,
	paracausal:false, // lancer-vtt's shorthand for "Cannot be reduced"
};

const failDamage = {
	title: "Fail Damage",
	damage: [{type: "Kinetic", val:damage.toString()}], // For learning purposes, val here only takes String arguments, so if damage is defined by a calculation, make sure you call .toString() on it when passing it in
	ap:false,
	half_damage:false,
	paracausal:false, // lancer-vtt's shorthand for "Cannot be reduced"
};

switch (wanted[0]) { // Defines a variable to display later
	case "Burst":
		var content = "Target token for centre of burst"
		break;
	default:
		var content = "Place AoE template"
		break;
}

// Wait for confirmation that targets are selected as desired via this Dialog
await Dialog.wait({
    title:"Confirm Targets",
    content:`
		<form>
			<div style="text-align:center"">
				// ${content} //<br>// Ensure selected targets are correct //<br>// Esc to cancel //
			</div>
			<hr>
		</form>
	`,
    buttons:{
		yes:{
			label:"OK",
			callback:async()=> {
				if (targeting === "Burst") { // Burst saves aren't typically found in 1st party material, but may be used in place of forcing all adjacent character to save
					let targets = []; // We use a function to determine grid distance instead of using the built-in templates for Burst due to it scaling with token size
					let initTarget = game.user.targets.first()
					for await(i of canvas.tokens.placeables) {
						if (tokenDistance(initTarget, i) < Number(aoeLength)+0.1 && initTarget !== i) { // Ignore originator of burst
							targets.push(i.document._id)
						};
					};
					game.user.updateTokenTargets(targets) // Set targets to all needed for burst
				};

				const targetIds = Array.from(game.user.targets.ids); // Creates an array of token IDs based on the tokens the user has targeted

				await game.macros.getName("Make Save").execute({
					tokenIds:targetIds, 
					originatorId:token.document._id, 
					saveConfig:saveConfig, 
					passCard: passCard, 
					failCard: failCard, 
					passDamage: passDamage, // If dmgConfigs aren't required in the macro you're making, remove them from these lines
					failDamage: failDamage,
					passStatuses: [], // Populate these with the lids of statuses you want applied on pass/fail respectively
					failStatuses: [],
				});
			}
		},
		no:{
			label:"Cancel",
			callback:{}
		}
	},
	close:async()=>{
		if (targeting !== "Single Target") {
			// Clean up template from canvas
			canvas.templates.placeables.reverse()[0].document.delete()
		};
	}
}, {top:100});