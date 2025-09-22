// This is resilient against future invade options granted by:
// Mech Systems
// Core Passives
// Talents
// MAYBE Mech Traits (I don't have anything to test it on ;_;)

// Selection Check
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

if (game.user.targets.size !== 1) {
	return ui.notifications.warn('Please target exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];
const target = game.user.targets.first();
const systems = token.actor.items.filter(i=>i.type==="mech_system")

invadeList = ["Fragment Signal"]
dscList = ["You feed false information, obscene messages, or phantom signals to your target’s computing core. They become IMPAIRED and SLOWED until the end of their next turn."]

try {
	let coreActions = token.actor.items.find(i=>i.type==="frame").system.core_system.passive_actions
	for await(i of coreActions) {
		if (i.activation === "Invade") {
			invadeList.push(i.name);
			dscList.push(i.detail);
		}
	}
} catch {
// pass - continue on with your day, no invades to be found in this core passive 
};

try {
	let traits = token.actor.items.find(i=>i.type==="frame").system.core_system.traits
	for await(i of traits) {
		for (j of traits.system.actions) {
			if (j.activation === "Invade") {
				invadeList.push(i.name);
				dscList.push(i.detail);
			}
		}
	}
} catch {
// pass - continue on with your day, no invades to be found in these traits
};

for await(i of systems) {
    if (i.system.destroyed===true) continue;
	const actions = i.system.actions;
	for await(j of actions) {
		if (j.activation === "Invade") {
			invadeList.push(j.name);
			dscList.push(j.detail);
		}
	}
};

let talents = token.actor.system.pilot.value.items.filter(i=>i.type==="talent");
for await(i of talents){
    for await(j of i.system.actions) {
        if (j.activation==="Invade") {
            invadeList.push(j.name);
            dscList.push(j.detail);
        }
    }
};

await Dialog.wait({
	title:"Invade // Target: "+target.document.name,
	buttons: invadeList.map((invade) => {
		if (typeof game.macros.getName(invade) !== "undefined") {
			var img = game.macros.getName(invade).img
		} else {
			var img = "systems/lancer/assets/icons/white/tech_full.svg"
		};
		return {
			label:`
      <div style="display: flex; align-items: center; margin-bottom: 1px; width: 300px;">
        <div style="width: 40px; height: 40px; overflow: hidden; margin-right: 10px;">
          <img src="${img}" style="width: 100%; height: auto;">
        </div>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">// ${invade} //</span>
      </div>
    `,
			callback: async() => {
				techAtk = new(game.lancer.flows.get("TechAttackFlow"))(token.actor, {invade:true});
				await techAtk.begin();
				const rolled = game.messages.contents.reverse()[0].rolls[0]._total;
				if (rolled >= target.actor.system.edef) {
					const wait = async (ms) => new Promise((resolve)=> setTimeout(resolve, ms));
					await wait(2400);
					let noMacroChat = {
						title:invade,
						description:dscList[invadeList.indexOf(invade)]
					};
					await new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, noMacroChat).begin();
					if (typeof game.macros.getName(invade) !== "undefined") {
						await game.macros.getName(invade).execute()
					}
				}
			}
		}
	})
});