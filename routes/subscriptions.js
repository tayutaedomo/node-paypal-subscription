var paypal = require('paypal-rest-sdk');
var express = require('express');
var router = express.Router();
var beautify = require('js-beautify').js_beautify;
var moment = require('moment');

//
// Initialize PayPal
//
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || ''
});


router.get('/', function(req, res, next) {
  paypal.generateToken(function(err, token) {
    res.render('subscriptions/index', {
      title: 'PayPal Initialization Check',
      token: token || '',
      error: err || {}
    });
  });
});

router.get('/plans', function(req, res, next) {
  var searchCondition = {
    status: req.query['status'] || 'active',
    page: req.query['page'] || 0,
    page_size: req.query['page_size'] || 3
  };

  paypal.billingPlan.list(searchCondition, function (err, result) {
    if (err) {
      res.render('subscriptions/plans', {
        title: 'Subscription Plans',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        data: {
          inputParams: searchCondition
        }
      });
    } else {
      res.render('subscriptions/plans', {
        title: 'Subscription Plans',
        error: {},
        data: {
          inputParams: searchCondition,
          plans: result,
          planCount: result.plans ? result.plans.length : 0,
          plansStr: beautify(JSON.stringify(result), { indent_size: 2 })
        }
      });
    }
  });
});

router.get('/plan', function(req, res, next) {
  res.render('subscriptions/plan', {
    title: 'Subscription Plan Creation',
    error: {},
    billingPlan: {}
  });
});

router.post('/plan', function(req, res, next) {
  var billingPlanAttributes = createBillingPlanAttributesFrom(req);

  paypal.billingPlan.create(billingPlanAttributes, function (err, billingPlan) {
    if (err) {
      res.render('subscriptions/plan', {
        title: 'Subscription Plan Creation Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        billingPlan: {}
      });
    } else {
      res.render('subscriptions/plan', {
        title: 'Subscription Plan Created',
        error: {},
        billingPlan: billingPlan,
        billingPlanStr: beautify(JSON.stringify(billingPlan), { indent_size: 2 })
      });
    }
  });
});

function createBillingPlanAttributesFrom(req) {
  return {
    name: req.body.name,
    description: req.body.description,
    type: req.body.type,
    payment_definitions: [
      {
        name: req.body.pd_name,
        type: req.body.pd_type,
        frequency_interval: req.body.pd_frequency_interval,
        frequency: req.body.pd_frequency,
        cycles: req.body.pd_cycles,
        amount: {
          currency: req.body.pd_currency,
          value: req.body.pd_amount
        }
      },
    ],
    merchant_preferences: {
      setup_fee: {
        currency: req.body.mp_setup_currency,
        value: req.body.pd_setup_amount
      },
      cancel_url: req.body.mp_cancel_url,
      return_url: req.body.mp_return_url,
      auto_bill_amount: req.body.mp_auto_bill_amount,
      initial_fail_amount_action: req.body.mp_initial_fail_amount_action
    }
  };
}

router.get('/plan_activation', function(req, res, next) {
  res.render('subscriptions/plan_activation', {
    title: 'Subscription Plan Activation',
    error: {},
    result: {}
  });
});

router.post('/plan_activation', function(req, res, next) {
  paypal.billingPlan.activate(req.body.plan_id, function (err, result) {
    if (err) {
      res.render('subscriptions/plan_activation', {
        title: 'Subscription Plan Activation Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        result: {}
      });
    } else {
      res.render('subscriptions/plan_activation', {
        title: 'Subscription Plan Activated',
        error: {},
        result: result,
        resultStr: beautify(JSON.stringify(result), { indent_size: 2 })
      });
    }
  });
});

router.get('/plan/detail', function(req, res, next) {
  var planId = req.query.id;

  if (! planId) {
    res.render('subscriptions/plan_detail', {
      title: 'Subscription Plan Detail',
      error: {},
      billingPlan: {}
    });
    return;
  }

  paypal.billingPlan.get(planId, function (err, billingPlan) {
    if (err) {
      res.render('subscriptions/plan_detail', {
        title: 'Subscription Plan Detail Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        billingPlan: {}
      });
    } else {
      res.render('subscriptions/plan_detail', {
        title: 'Subscription Plan Detail',
        error: {},
        billingPlan: billingPlan,
        billingPlanStr: beautify(JSON.stringify(billingPlan), { indent_size: 2 })
      });
    }
  });
});

router.get('/agreement', function(req, res, next) {
  res.render('subscriptions/agreement', {
    title: 'Subscription Agreement Creation',
    error: {},
    data: {
      formInputs: createBillingAgreementFormInputs(req)
    }
  });
});

router.post('/agreement', function(req, res, next) {
  var billingAgreementAttributes = createBillingAgreementAttributes(req);

  paypal.billingAgreement.create(billingAgreementAttributes, function (err, billingAgreement) {
    if (err) {
      res.render('subscriptions/agreement', {
        title: 'Subscription Agreement Creation Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        data: {
          formInputs: createBillingAgreementFormInputs(req)
        }
      });
    } else {
      res.render('subscriptions/agreement', {
        title: 'Subscription Agreement Created',
        error: {},
        data: {
          formInputs: createBillingAgreementFormInputs(req),
          billingAgreement: billingAgreement,
          billingAgreementStr: beautify(JSON.stringify(billingAgreement), { indent_size: 2 }),
          redirect_url: billingAgreement.links[0].href
        }
      });
    }
  });
});

function createBillingAgreementFormInputs(req) {
  return {
    startDate: req.body.startDate || moment().utc().add(1, 'minutes').toISOString(),
  };
}

function createBillingAgreementAttributes(req) {
  return {
    name: req.body.name,
    description: req.body.description,
    start_date: req.body.startDate,
    payer: {
      payment_method: req.body.paymentMethod
    },
    plan: {
      id: req.body.planId
    }
    //override_merchant_preferences: {
    //  setup_fee: {
    //    currency: req.body.mpSetupCurrency,
    //    value: req.body.pdSetupAmount
    //  }
    //}
  };
}

router.get('/agreement/detail', function(req, res, next) {
  var agreementId = req.query.id;

  if (! agreementId) {
    res.render('subscriptions/agreement_detail', {
      title: 'Subscription Agreement Detail',
      error: {},
      billingAgreement: {}
    });
    return;
  }

  paypal.billingAgreement.get(agreementId, function (err, billingAgreement) {
    if (err) {
      res.render('subscriptions/agreement_detail', {
        title: 'Subscription Agreement Detail Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        billingAgreement: {}
      });
    } else {
      res.render('subscriptions/agreement_detail', {
        title: 'Subscription Agreement Detail',
        error: {},
        billingAgreement: billingAgreement,
        billingAgreementStr: beautify(JSON.stringify(billingAgreement), { indent_size: 2 })
      });
    }
  });
});

router.get('/agreement/transactions', function(req, res, next) {
  var agreementId = req.query.id;
  var startDate = req.query.startDate;
  var endDate = req.query.endDate;
  var formInputs = {
    agreementId: agreementId || '',
    startDate: startDate || moment().utc().format("YYYY-MM-DD"),
    endDate: endDate || moment().utc().add(1, 'months').format("YYYY-MM-DD")
  };

  console.log(agreementId);
  console.log(startDate);
  console.log(endDate);
  if (! agreementId || ! startDate || ! endDate) {
    res.render('subscriptions/agreement_transactions', {
      title: 'Subscription Agreement Transactions',
      error: {},
      data: {
        formInputs: formInputs
      }
    });
    return;
  }

  paypal.billingAgreement.searchTransactions(
      agreementId, startDate, endDate, function (err, billingAgreementTransactions) {

    if (err) {
      res.render('subscriptions/agreement_transactions', {
        title: 'Subscription Agreement Transactions Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        data: {
          formInputs: formInputs
        }
      });
    } else {
      res.render('subscriptions/agreement_transactions', {
        title: 'Subscription Agreement Transactions',
        error: {},
        data: {
          formInputs: formInputs,
          result: billingAgreementTransactions,
          resultStr: beautify(JSON.stringify(billingAgreementTransactions), { indent_size: 2 })
        }
      });
    }
  });
});

router.get('/callback/success', function(req, res, next) {
  res.render('subscriptions/callback/success', {
    title: 'Subscription Success Callback',
    data: { token: req.query.token }
  });
});

router.get('/callback/cancel', function(req, res, next) {
  res.render('subscriptions/callback/cancel', {
    title: 'Subscription Cancel Callback',
    data: { token: req.query.token }
  });
});

router.get('/agreement_execution', function(req, res, next) {
  res.render('subscriptions/agreement_execution', {
    title: 'Subscription Agreement Execution',
    error: {},
    result: {}
  });
});

router.post('/agreement_execution', function(req, res, next) {
  paypal.billingAgreement.execute(req.body.token, function (err, result) {
    if (err) {
      res.render('subscriptions/agreement_execution', {
        title: 'Subscription Agreement Execution Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        result: {}
      });
    } else {
      res.render('subscriptions/agreement_execution', {
        title: 'Subscription Agreement Executed',
        error: {},
        result: result,
        resultStr: beautify(JSON.stringify(result), { indent_size: 2 })
      });
    }
  });
});

router.get('/agreement_cancellation', function(req, res, next) {
  res.render('subscriptions/agreement_cancellation', {
    title: 'Subscription Agreement Cancellation',
    error: {},
    result: {}
  });
});

router.post('/agreement_cancellation', function(req, res, next) {
  var params = {
    note: 'Manually canceled.'
  };
  paypal.billingAgreement.cancel(req.body.id, params, function (err, result) {
    var template = 'subscriptions/agreement_cancellation';

    if (err) {
      res.render(template, {
        title: 'Subscription Agreement Cancellation Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        result: {}
      });
    } else {
      res.render(template, {
        title: 'Subscription Agreement Canceled',
        error: {},
        result: result,
        resultStr: beautify(JSON.stringify(result), { indent_size: 2 })
      });
    }
  });
});

router.get('/agreement_suspend', function(req, res, next) {
  res.render('subscriptions/agreement_suspend', {
    title: 'Subscription Agreement Suspend',
    error: {},
    result: {}
  });
});

router.post('/agreement_suspend', function(req, res, next) {
  var params = {
    note: 'Manually suspended.'
  };
  paypal.billingAgreement.suspend(req.body.id, params, function (err, result) {
    var template = 'subscriptions/agreement_suspend';

    if (err) {
      res.render(template, {
        title: 'Subscription Agreement Suspend Failed',
        error: err,
        errorStr: beautify(JSON.stringify(err), { indent_size: 2 }),
        result: {}
      });
    } else {
      res.render(template, {
        title: 'Subscription Agreement Suspend',
        error: {},
        result: result,
        resultStr: beautify(JSON.stringify(result), { indent_size: 2 })
      });
    }
  });
});


module.exports = router;

