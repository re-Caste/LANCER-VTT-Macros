// Stop if not properly selected
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

if (game.user.targets.length !== 1) {
	return ui.notifications.warn('Please target exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];
const target = game.user.targets.first();

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

const dmgConfigPass = {
	title: "Pass Damage",
	damage: [{type: "Kinetic", val:damage.toString()}],
    half_damage:true
};

const dmgConfigFail = {
	title: "Fail Damage",
	damage: [{type: "Kinetic", val:damage.toString()}],
};

await Dialog.wait({
	title:"Confirm AoE Placement",
	content:"Ensure selected targets are correct // Esc to cancel",
	buttons:{
		yes:{
			label:"Confirm",
			callback:async()=> {
				await game.macros.getName("Make Save").execute({
					tokenIds:[target.document._id],
					originatorId:token.document._id,
					saveConfig:saveConfig,
					passConfig: passConfig,
					failConfig: failConfig,
					passEffect: [[],dmgConfigPass],
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