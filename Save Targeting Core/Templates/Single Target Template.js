// Stop if not properly selected
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];

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

// Wait for confirmation that targets are selected as desired via this Dialog
await Dialog.wait({
    title:"Confirm Targets",
    content:`
		<form>
			<div style="text-align:center"">
				// Target desired token //<br>// Ensure selected targets are correct //<br>// Esc to cancel //
			</div>
			<hr>
		</form>
	`,
    buttons:{
		yes:{
			label:"OK",
			callback:async()=> {
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
	}
}, {top:100});