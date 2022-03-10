require('dotenv').config();

const { HarmonySite} = require('harmonysite');
const updateMailChimp = require('./src/updateMailChimp');
const _ = require("lodash");

const harmonySite = new HarmonySite('https://www.hcamusic.org');
const username = process.env.HARMONYSITE_USERNAME;
const password = process.env.HARMONYSITE_PASSWORD;

const main = async () => {
  await harmonySite.authorise(username, password);
  const membersTable = await harmonySite.browse({
    table: 'members',
    n: 1000,
  });

  const membershipTable = await harmonySite.browse({
    table: 'memberships',
    n: 1000,
  });

  const memberships = _.keyBy(
    membershipTable.records.membership,
    (member) => member.Member
  );

  const members = membersTable.records.member
    .filter(member => memberships[member.id]
      && memberships[member.id].Type === "Member"
      && memberships[member.id].Status === "Active"
      && memberships[member.id].Level === "Full"
    )

  await updateMailChimp(members);
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
