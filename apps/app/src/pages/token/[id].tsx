import Head from 'next/head';
import { useRouter } from 'next/router';
import { appUrl } from '@/utils/config';
import Layout from '@/components/Layouts';
import { ReactElement, useEffect, useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { env } from 'next-runtime-env';
import useTranslation from 'next-translate/useTranslation';
import { Token } from '@/utils/types';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import queryString from 'qs';
import classNames from 'classnames';
import fetcher from '@/utils/fetcher';
import Overview from '@/components/Tokens/FT/Overview';
import Transfers from '@/components/Tokens/FT/Transfers';
import Holders from '@/components/Tokens/FT/Holders';
import Info from '@/components/Tokens/FT/Info';
import FAQ from '@/components/Tokens/FT/FAQ';
import TokenFilter from '@/components/Tokens/FT/TokenFilter';
import { Spinner } from '@/components/common/Spinner';
import { VmComponent } from '@/components/vm/VmComponent';
import { useBosComponents } from '@/hooks/useBosComponents';
import Comment from '@/components/skeleton/common/Comment';
import { useAuthStore } from '@/stores/auth';

const network = env('NEXT_PUBLIC_NETWORK_ID');
const ogUrl = env('NEXT_PUBLIC_OG_URL');

const tabs = ['transfers', 'holders', 'info', 'faq', 'comments'];

type TabType = 'transfers' | 'holders' | 'info' | 'faq' | 'comments';

export const getServerSideProps: GetServerSideProps<{
  statsDetails: any;
  tokenDetails: any;
  transfersDetails: any;
  holdersDetails: any;
  syncDetails: any;
  data: any;
  dataCount: any;
  error: boolean;
  tab: string;
  accountDetais: any;
  contractDetails: any;
  tokenFilterDetails: any;
}> = async (context) => {
  const {
    query: { id = '', a = '', tab = 'transfers', ...query },
  }: {
    query: { id?: string; a?: string; tab?: TabType } & Record<string, any>;
  } = context;

  const urlMapping: Record<string, { api: string; count?: string }> = {
    transfers: { api: `fts/${id}/txns`, count: `fts/${id}/txns/count` },
    holders: { api: `fts/${id}/holders`, count: `fts/${id}/holders/count` },
    info: { api: `fts/${id}` },
    faq: { api: `fts/${id}/holders`, count: `fts/${id}/holders/count` },
    comments: { api: `account/${id}/contract/deployments` },
  };

  const apiUrls = urlMapping[tab as TabType];
  if (!apiUrls) {
    return { notFound: true };
  }

  if (tab === 'transfers' && a) {
    query.a = a;
  }

  const fetchUrl = `${apiUrls.api}${
    query ? `?${queryString.stringify(query)}` : ''
  }`;
  const countUrl =
    apiUrls.count &&
    `${apiUrls.count}${query ? `?${queryString.stringify(query)}` : ''}`;

  const fetchData = async (url: string | undefined) =>
    url ? await fetcher(url) : null;

  try {
    const [
      statsResult,
      tokenResult,
      transfersResult,
      holdersResult,
      syncResult,
      dataResult,
      dataCountResult,
      accountResult,
      contractResult,
      tokenFilterResult,
    ] = await Promise.allSettled([
      fetchData('stats'),
      fetchData(id && `fts/${id}`),
      fetchData(id && `fts/${id}/txns/count`),
      fetchData(id && `fts/${id}/holders/count`),
      fetchData('sync/status'),
      fetchData(fetchUrl),
      fetchData(countUrl),
      fetchData(id && `account/${id}`),
      fetchData(id && `account/${id}/contract/deployments`),
      fetchData(a && `account/${a}/inventory`),
    ]);

    const getResult = (result: PromiseSettledResult<any>) =>
      result.status === 'fulfilled' ? result.value : null;

    return {
      props: {
        statsDetails: getResult(statsResult),
        tokenDetails: getResult(tokenResult),
        transfersDetails: getResult(transfersResult),
        holdersDetails: getResult(holdersResult),
        syncDetails: getResult(syncResult),
        data: getResult(dataResult),
        dataCount: getResult(dataCountResult),
        error: dataResult.status === 'rejected',
        tab,
        accountDetais: getResult(accountResult),
        contractDetails: getResult(contractResult),
        tokenFilterDetails: getResult(tokenFilterResult),
      },
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      props: {
        statsDetails: null,
        tokenDetails: null,
        transfersDetails: null,
        holdersDetails: null,
        syncDetails: null,
        data: null,
        dataCount: null,
        error: true,
        tab: 'transfers',
        accountDetais: null,
        contractDetails: null,
        tokenFilterDetails: null,
      },
    };
  }
};

const TokenDetails = ({
  statsDetails,
  tokenDetails,
  transfersDetails,
  holdersDetails,
  syncDetails,
  data,
  dataCount,
  error,
  tab,
  accountDetais,
  contractDetails,
  tokenFilterDetails,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();
  const { id, a }: any = router.query;
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const hashes = ['Transfers', 'Holders', 'Info', 'FAQ', 'Comments'];
  const components = useBosComponents();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleRouteChangeStart = (url: string) => {
      if (url !== router.asPath) {
        timeout = setTimeout(() => {
          setLoading(true);
        }, 300);
      }
    };

    const handleRouteChangeComplete = () => {
      setLoading(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeComplete);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeComplete);
    };
  }, [router]);

  const token: Token = tokenDetails?.contracts?.[0];
  const transfers = transfersDetails?.txns?.[0]?.count;
  const holders = holdersDetails?.holders?.[0]?.count;
  const stats = statsDetails?.stats[0];
  const inventoryData = tokenFilterDetails?.inventory;

  const txns = data?.txns || [];
  const count = dataCount?.txns?.[0]?.count;
  const txnCursor = data?.cursor;
  const account = accountDetais?.account?.[0];
  const contract = contractDetails?.deployments?.[0];

  const holder = data?.holders || [];
  const holderCount = dataCount?.holders?.[0]?.count;
  const status = syncDetails?.status?.aggregates.ft_holders || {
    height: '0',
    sync: true,
    timestamp: '',
  };

  const title = `${network === 'testnet' ? 'TESTNET ' : ''}${
    token ? `${token.name} (${token.symbol}) ` : ''
  }Stats, Price, Holders & Transactions | NearBlocks`;
  const description = token
    ? `All ${token.name} (${token.symbol}) information in one place : Statistics, price, market-cap, total & circulating supply, number of holders & latest transactions`
    : '';
  const thumbnail = `${ogUrl}/thumbnail/token?token=${token?.name}&network=${network}&brand=near`;

  const requestSignInWithWallet = useAuthStore(
    (store) => store.requestSignInWithWallet,
  );

  useEffect(() => {
    if (tab) {
      const index = tabs.indexOf(tab as string);
      if (index !== -1) {
        setTabIndex(index);
      }
    }
  }, [tab]);

  const onTab = (index: number) => {
    setTabIndex(index);
    const { id } = router.query;
    const newQuery = { id, tab: tabs[index] };
    router.push({
      pathname: router.pathname,
      query: newQuery,
    });
  };

  const getClassName = (selected: boolean) =>
    classNames(
      'text-nearblue-600 text-xs leading-4 font-medium overflow-hidden inline-block cursor-pointer p-2 mb-3 mr-2 focus:outline-none',
      {
        'hover:bg-neargray-800 bg-neargray-700 rounded-lg hover:text-nearblue-600 dark:text-white dark:hover:text-neargray-25  dark:bg-black-200':
          !selected,
        'rounded-lg bg-green-600 dark:bg-green-250  text-white': selected,
      },
    );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="og:image" content={thumbnail} />
        <meta property="og:image:secure_url" content={thumbnail} />
        <meta name="twitter:image:src" content={thumbnail} />
        <link rel="canonical" href={`${appUrl}/token/${id}}`} />
      </Head>
      {loading && <Spinner />}
      <div className="relative container mx-auto px-3">
        <section>
          <Overview
            stats={stats}
            token={token}
            status={status}
            transfers={transfers}
            holders={holders}
          />
          <div className="py-6"></div>
          {a && (
            <TokenFilter
              id={id}
              tokenFilter={a}
              inventoryData={inventoryData}
            />
          )}
          <div className="block lg:flex lg:space-x-2 mb-4">
            <div className="w-full">
              <Tabs onSelect={(index) => onTab(index)} selectedIndex={tabIndex}>
                <TabList className={'flex flex-wrap'}>
                  <Tab
                    className={getClassName(hashes[0] === hashes[tabIndex])}
                    selectedClassName="rounded-lg bg-green-600 dark:bg-green-250 text-white"
                  >
                    <h2>{t('token:fts.ft.transfers')}</h2>
                  </Tab>
                  <Tab
                    className={getClassName(hashes[1] === hashes[tabIndex])}
                    selectedClassName="rounded-lg bg-green-600 dark:bg-green-250 text-white"
                  >
                    <h2>{t('token:fts.ft.holders')}</h2>
                  </Tab>
                  <Tab
                    className={getClassName(hashes[2] === hashes[tabIndex])}
                    selectedClassName="rounded-lg bg-green-600 dark:bg-green-250 text-white"
                  >
                    <h2>Info</h2>
                  </Tab>
                  <Tab
                    className={getClassName(hashes[3] === hashes[tabIndex])}
                    selectedClassName="rounded-lg bg-green-600 dark:bg-green-250 text-white"
                  >
                    <h2>FAQ</h2>
                  </Tab>
                  <Tab
                    className={getClassName(hashes[4] === hashes[tabIndex])}
                    selectedClassName="rounded-lg bg-green-600 dark:bg-green-250 text-white"
                  >
                    <h2>Comments</h2>
                  </Tab>
                </TabList>
                <div className="bg-white dark:bg-black-600 soft-shadow rounded-xl pb-1">
                  <TabPanel>
                    <Transfers
                      txns={txns}
                      count={count}
                      error={error}
                      cursor={txnCursor}
                      tab={tab}
                    />
                  </TabPanel>
                  <TabPanel>
                    <Holders
                      token={token}
                      status={status}
                      holder={holder}
                      count={holderCount}
                      error={error}
                      tab={tab}
                    />
                  </TabPanel>
                  <TabPanel>
                    <Info token={token} error={error} tab={tab} />
                  </TabPanel>
                  <TabPanel>
                    <FAQ
                      id={id}
                      token={token}
                      account={account}
                      contract={contract}
                      transfers={transfers}
                      holdersData={holder}
                      holdersCount={holderCount}
                      tab={tab}
                    />
                  </TabPanel>
                  <TabPanel>
                    {tab === 'comments' ? (
                      <VmComponent
                        src={components?.commentsFeed}
                        defaultSkelton={<Comment />}
                        props={{
                          network: network,
                          path: `nearblocks.io/token/${id}`,
                          limit: 10,
                          requestSignInWithWallet,
                        }}
                        loading={<Comment />}
                      />
                    ) : (
                      <div className="w-full h-[500px]"></div>
                    )}
                  </TabPanel>
                </div>
              </Tabs>
            </div>
          </div>
          <div className="py-8"></div>
        </section>
      </div>
    </>
  );
};

TokenDetails.getLayout = (page: ReactElement) => <Layout>{page}</Layout>;

export default TokenDetails;
