// Generic macro to allow for save targeting effects
// Run as "Everyone" using Advanced Macros

// Passed arguments: 
// tokenIds - Array of target IDs, 
// originatorId - Token Id, 
// saveConfig - parameters, 
// passConfig - parameters, 
// failConfig - parameters, 
// passEffect - parameters, 
// failEffect - parameters

const token = canvas.tokens.get(scope.tokenId);
const passes = [];
const fails = [];
scope.passIds.forEach(async(target) => {
	passes.push(canvas.tokens.get(target)) 
});
scope.failIds.forEach(async(target) => {
	fails.push(canvas.tokens.get(target)) 
});
const applyStatus = game.macros.getName("Apply Statuses")

// Pass configs
const passStatuses = scope.passConfig[0];
var passDmgConfig = scope.passConfig[1];
if (passDmgConfig === undefined) {
	var passDmgConfig = false;
};

// Fail configs
const failStatuses = scope.failConfig[0];
var failDmgConfig = scope.failConfig[1];
if (failDmgConfig === undefined) {
	var failDmgConfig = false;
};

permList = []
// Create list of users with "OWNER" permissions to this token
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

async function pass(target) {
	if (passDmgConfig !== false) {
		canvas.tokens.controlled[0] = canvas.tokens.get(tokenId)
		await target.setTarget(true, {user: game.user, releaseOthers: true});
		const damageFlow = new(game.lancer.flows.get("DamageRollFlow"))(token.actor, passDmgConfig);
		await damageFlow.begin();
	};

	if (passStatuses.length > 0) {
		await applyStatus.execute({targetId:target.document._id, statuses:passStatuses})
	};
};

async function fail(target) {
	if (failDmgConfig !== false) {
		canvas.tokens.controlled[0] = canvas.tokens.get(tokenId)
		await target.setTarget(true, {user: game.user, releaseOthers: true});
		const damageFlow = new(game.lancer.flows.get("DamageRollFlow"))(token.actor, failDmgConfig);
		await damageFlow.begin();
	};

	if (failStatuses.length > 0) {
		await applyStatus.execute({targetId:target.document._id, statuses:failStatuses})
	};
};

for await (i of passes) {
	await pass(i)
};
for await (i of fails){
	await fail(i)
};