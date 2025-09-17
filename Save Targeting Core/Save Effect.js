// Generic macro to allow for save targeting effects
// Run as "Everyone" using Advanced Macros

// Passed arguments:
// originatorId - Token Id,
// targetIds - Array of token Ids 
// passConfig - Array in form [[status lids], dmgParams],
// failConfig - Array in form [[status lids], dmgParams], 

const applyStatus = game.macros.getName("Apply Statuses")
const token = canvas.tokens.get(scope.tokenId);
if (typeof token.document.getFlag("world", "saveEffectCheck") !== "undefined") {
	return;
};
await token.document.setFlag("world", "saveEffectCheck", true) // Only allow the Dialog to be open once

// Define pass configs
var passDamage = scope.passDamage;
if (typeof passDamage === undefined) {
	passDamage = false;
};
var passStatuses = scope.passStatuses;
if (typeof passStatuses === "undefined") {
    passStatuses = []
};

// Define fail configs
var failDamage = scope.failDamage;
if (typeof failDamage === undefined) {
	failDamage = false;
};
var failStatuses = scope.failStatuses;
if (typeof failStatuses === "undefined") {
    failStatuses = []
};

// Create list of users with "OWNER" permissions to this token
permList = []
for (i in game.users.contents) {
	if (token.actor.testUserPermission(game.users.contents[i], "OWNER")) {
		permList.push(game.users.contents[i])
	}
};

// If a player other than the GM has "OWNER" perms, let this resolve on their end
if (permList.length > 1) {
	for (i in permList) {
		if (permList[i].isGM) {
			permList.splice(i, 1);
		};
	};
};

// Stop if player not permitted
if (!permList.includes(game.user)) {
	return;
};

// Wait for all saves to be complete
await Dialog.wait({
	title:"Confirm saves",
    content:`
        <form>
            <div class="form-group">
                Wait for all saves to be made before continuing.
            </div>
            <hr>
        </form>
    `,
    buttons:{
        ok:{
            label:"OK",
            callback:async()=>{
                let passIds = [];
                let failIds = []
                for await(i of scope.targetIds) { // Populate Id Arrays and unset flags from appropriate tokens
                    let j = canvas.tokens.get(i)
                    if (typeof j.document.getFlag("world", "pass") !== "undefined" && j.document.getFlag("world", "pass") === true) {
                        passIds.push(i);
                        j.document.unsetFlag("world", "pass");
                    };
                    if (typeof j.document.getFlag("world", "fail") !== "undefined" && j.document.getFlag("world", "fail") === true) {
                        failIds.push(i);
                        j.document.unsetFlag("world", "fail");
                    }
                };
                await canvas.tokens.selectObjects(token) // Ensure original token is selected

                // TO DO - Figure how to combine these into a singular damage roll
                if (passIds.length > 0) {
                    await game.user.updateTokenTargets(passIds);
                    if (passDamage !== false) {
                        const passFlow = new(game.lancer.flows.get("DamageRollFlow"))(token.actor, passDamage);
                        await passFlow.begin();
                    };
                    if (passStatuses.length > 0) {
                        for await(i of passIds) {
                            applyStatus.execute({targetId:i, statuses:passStatuses})
                        }
                    };
                };

                if (failIds.length > 0) {
                    await game.user.updateTokenTargets(failIds);
                    if (failDamage !== false) {
                        const failFlow = new(game.lancer.flows.get("DamageRollFlow"))(token.actor, failDamage);
                        await failFlow.begin();
                    };
                    if (failStatuses.length > 0) {
                        for await(i of passIds) {
                            applyStatus.execute({targetId:i, statuses:failStatuses})
                        }
                    };
                }
            }
        },
        cancel:{
            label:"Cancel",
            callback:async()=>{
                return ui.notifications.warn("Save Effect cancelled.", {})
            }
        }
    },
    close:async()=>{
        // Clear Dialog-stopping flag when Dialog is closed
        await token.document.unsetFlag("world", "saveEffectCheck");
    }
}, {top:100});
// Clear token targets after Dialog is finished
await game.user.updateTokenTargets();