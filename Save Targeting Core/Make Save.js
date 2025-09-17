// Generic macro to allow for save targeting effects
// Run as "Everyone" using Advanced Macros

// effectConfig parameters are in the form [[statuses], {damagecard}]

// Passed arguments: 
// tokenIds - Array of target IDs, 
// originatorId - Token Id, 
// saveConfig - Parameters, 
// passConfig - Parameters, 
// failConfig - Parameters, 
// passEffect - Parameters, 
// failEffect - Parameters

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
		const rollFlow = new(game.lancer.flows.get("StatRollFlow"))(token.actor, saveConfig);
		await rollFlow.begin();

		// Get last rolled dice
		const rolled = game.messages?.contents[game.messages?.contents.length - 1].rolls[0]._total;
		canvas.tokens.controlled[0] = token; //force select their own token to ensure chat messages display properly
		if (rolled < save) { // Fail state
			// Send fail message
			const failFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, failConfig);
			await failFlow.begin();
			await token.document.setFlag("world", "fail", true);
		} else { // Success state
			const passFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, passConfig);
			await passFlow.begin();
			await token.document.setFlag("world", "pass", true);
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