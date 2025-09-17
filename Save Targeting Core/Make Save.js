// Generic macro to allow for save targeting effects
// Run as "Everyone" using Advanced Macros

// Passed arguments: 
// tokenIds - Array of target IDs, 
// originatorId - Token Id, 
// saveConfig - statFlowParams, 
// passEffect - simpleTextParams, 
// failEffect - simpleTextParams, 
// passConfig - Array in form [[status lids], dmgParams], 
// failConfig - Array in form [[status lids], dmgParams],

const originator = canvas.tokens.get(scope.originatorId)

// Data handling check
if (typeof originator.document.getFlag("world", "saveEffectCheck") !== "undefined") {
    originator.document.unsetFlag("world", "saveEffectCheck");
};

const tokens = []
for await (i of scope.tokenIds) {
	tokens.push(canvas.tokens.get(i))
};

const saveConfig = scope.saveConfig;
const passConfig = scope.passConfig;
const failConfig = scope.failConfig;
const effect = game.macros.getName("Save Effect");

var passEffect = scope.passEffect; // This may be empty if the effects are only something that can't be cleanly automated (e.g. pulling)
if (typeof passEffect === undefined) {
	passEffect = false
};
var failEffect = scope.failEffect; // This may be empty if the effects are only something that can't be cleanly automated (e.g. pulling)
if (typeof failEffect === undefined) {
	failEffect = false
};

let passes = [];
let fails = [];
for await(token of tokens) {
	const save = token.actor.system.save;
	let permList = []
	// Create list of users with "OWNER" permissions to this token
	for await (j of game.users.contents) {
		if (token.actor.testUserPermission(j, "OWNER")) {
			permList.push(j)
		}
	};

	// If a player other than the GM has "OWNER" perms, let this resolve on their end
	if (permList.length > 1) {
		for (j in permList) {
			if (permList[j].isGM) {
				permList.splice(j, 1);
			};
		};
	};

	// Stop if player not permitted
	if (!permList.includes(game.user)) {
		continue;
	};

	//Initialise flow
	try {
		await canvas.tokens.selectObjects(originator) // Ensure original token is selected
		const rollFlow = new(game.lancer.flows.get("StatRollFlow"))(token.actor, saveConfig); // Force save flow
		await rollFlow.begin();
		const rolled = game.messages?.contents[game.messages?.contents.length - 1].rolls[0]._total; // Get roll from save flow
		if (rolled < save) {
			const failFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, failConfig); // Run the effect card
			await failFlow.begin();
			await token.document.setFlag("world", "fail", true); // Set flag on target denoting fail state
		} else {
			const passFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, passConfig); // Run the effect card
			await passFlow.begin();
			await token.document.setFlag("world", "pass", true); // Set flag on target denoting pass state
		};
	} catch {
		continue;
	};
};

//Apply effects
await game.macros.getName("Save Effect").execute({
	tokenId:originatorId,
    targetIds:scope.tokenIds,
	failConfig:failEffect, 
	passConfig:passEffect, 
});