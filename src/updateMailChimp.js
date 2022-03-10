const crypto = require('crypto');
const Mailchimp = require('mailchimp-api-v3');
const _ = require('lodash');

const mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);
const listId = process.env.MAILCHIMP_LIST_ID;

module.exports = async (chorusMembers) => {
  console.log('Updating MailChimp');

  const chorusMemberMap = _.keyBy(
    chorusMembers,
    (member) => member.Email
  );
  const chorusMemberEmails = Object.keys(chorusMemberMap);

  const listMembers = await mailchimp.get(`/lists/${listId}/members`, {
    count: 1000,
  });

  const listMembersMap = _.keyBy(
    listMembers.members,
    (member) => member.email_address
  );
  const listMemberEmails = Object.keys(listMembersMap);

  console.log(listMemberEmails.length)

  const emailsToUpdate = chorusMembers.map((member) => {
    const subscriberHash = crypto
      .createHash('md5')
      .update(member.Email)
      .digest('hex');

    return {
      method: 'put',
      path: `/lists/${listId}/members/${subscriberHash}`,
      body: {
        email_address: member.Email,
        status: 'subscribed',
        merge_fields: {
          'First Name': member.firstName,
          'Last Name': member.lastName,
          'Phone Number':
            member.cellPhone || member.homePhone || member.workPhone,
        },
      },
    };
  });

  const emailsToRemove = _.difference(listMemberEmails, chorusMemberEmails).map(
    (email) => ({
      method: 'delete',
      path: `/lists/${listId}/members/${listMembersMap[email].id}`,
    })
  );

  const batchActions = emailsToUpdate.concat(emailsToRemove);

  if (batchActions.length > 0) {
    console.log(
      `Adding/Updating ${emailsToUpdate.length}, removing ${emailsToRemove.length}`
    );

    const results = await mailchimp.batch(batchActions);

    const errors = results
      .filter((result) => result.errors)
      .map((result) => result.errors);

    if (errors.length > 0) {
      console.log('Failed to update mailchimp list');
      console.error(errors);
      process.exit(1);
    }
  }

  console.log('MailChimp up to date!');
};
