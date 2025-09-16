// Generic macro to allow for save targeting effects
// Run as "Everyone" using Advanced Macros

// effectConfig parameters are in the form [[statuses], {damagecard}]

// Passed arguments: 
// tokenIds - Array of target IDs, 
// originatorId - Token Id, 
// saveConfig - parameters, 
// passConfig - parameters, 
// failConfig - parameters, 
// passEffect - parameters, 
// failEffect - parameters

const originator = canvas.tokens.get(scope.originatorId)
const tokens = []
scope.tokenIds.forEach(async(token) => {
	await tokens.push(canvas.tokens.get(token))
});
const saveConfig = scope.saveConfig;
const passConfig = scope.passConfig;
const failConfig = scope.failConfig;
const effect = game.macros.getName("Save Effect");

var passEffect = scope.passEffect; // This may be empty if the effects are only something that can't be cleanly automated (e.g. pulling)
if (passEffect === undefined) {
	passEffect = false
};
var failEffect = scope.failEffect; // This may be empty if the effects are only something that can't be cleanly automated (e.g. pulling)
if (failEffect === undefined) {
	failEffect = false
};

const passes = []
const fails = []

for (i in tokens) {
	let token = tokens[i];
	const save = token.actor.system.save;
	permList = []
	// Create list of users with "OWNER" permissions to this token
	for (i in game.users.contents) {
		if (token.actor.testUserPermission(game.users.contents[i], "OWNER")) {
			await permList.push(game.users.contents[i])
		}
	};

	// If a player other than the GM has "OWNER" perms, let this resolve on their end
	if (permList.length > 1) {
		for (i in permList) {
			if (permList[i].isGM) {
				await permList.splice(i, 1);
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
			fails.push(token);
		} else { // Success state
			const passFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, passConfig);
			await passFlow.begin();
			passes.push(token)
		};
	} catch {
		continue;
	};
};

passIds = []
passes.forEach(async(token) => {
	passIds.push(token.document._id);
	const miss = false;
});

failIds = []
fails.forEach(async(token) => {
	failIds.push(token.document._id);
	const miss = true;
});

//Apply effects
if (failEffect !== false) {
	await effect.execute({
		tokenId:originatorId,
		failIds:failIds, 
		passIds:passIds, 
		failConfig:failEffect, 
		passConfig:passEffect, 
	});
};